export const BADGE_DEFINITIONS = {
  EARLY_BIRD: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Awarded for prompt payment of dues.',
    image: '/badges/badge_early_bird.png'
  },
  PHILANTHROPIST: {
    id: 'philanthropist',
    name: 'Philanthropist',
    description: 'Awarded for generous donations and charity contributions.',
    image: '/badges/badge_charity_donor.png'
  },
  ACTIVE_PARTICIPANT: {
    id: 'active_participant',
    name: 'Active Participant',
    description: 'Awarded for consistent attendance at events and meetings.',
    image: '/badges/badge_perfect_attendance.png'
  },
  OPINION_LEADER: {
    id: 'opinion_leader',
    name: 'Opinion Leader',
    description: 'Awarded for sharing valuable feedback and shaping the club\'s vision.',
    image: '/badges/badge_feedback_star.png'
  },
  TEAM_PLAYER: {
    id: 'team_player',
    name: 'Team Player',
    description: 'Awarded by peers for outstanding teamwork and collaboration.',
    image: '/badges/badge_team_player.png'
  },
  PAUL_HARRIS_FELLOW: {
    id: 'paul_harris_fellow',
    name: 'Paul Harris Fellow',
    description: 'A prestigious Rotary-centric award for substantial contributions.',
    image: '/badges/badge_paul_harris_fellow.png'
  },
  SERVICE_ABOVE_SELF: {
    id: 'service_above_self',
    name: 'Service Above Self',
    description: 'The Rotary motto, awarded for exceptional service to the community.',
    image: '/badges/badge_service_above_self.png'
  }
};

export const calculateMemberBadges = (memberId, payments, attendance, feedbacks, opinions = []) => {
  const earnedBadges = [];

  // Check Early Bird (Paid payments for dues/fees)
  const paidDues = payments.filter(p => {
    if (String(p["Member ID"]) !== String(memberId) || p["Status"] !== 'Paid') return false;
    const cat = (p["Category"] || '').toLowerCase();
    const desc = (p["Description"] || '').toLowerCase();
    return !p["Category"] || cat.includes('fee') || cat.includes('due') || desc.includes('due');
  });
  paidDues.forEach(p => {
    earnedBadges.push({ ...BADGE_DEFINITIONS.EARLY_BIRD, date: p["Paid Date"] || p["Due Date"] || p["Created At"] });
  });

  // Check Philanthropist (Paid Donation/Charity)
  const paidDonations = payments.filter(p => {
    if (String(p["Member ID"]) !== String(memberId) || p["Status"] !== 'Paid') return false;
    const cat = (p["Category"] || '').toLowerCase();
    const desc = (p["Description"] || '').toLowerCase();
    return cat.includes('donation') || cat.includes('charity') || desc.includes('donation') || desc.includes('charity');
  });
  paidDonations.forEach(p => {
    earnedBadges.push({ ...BADGE_DEFINITIONS.PHILANTHROPIST, date: p["Paid Date"] || p["Due Date"] || p["Created At"] });
  });

  // Check Active Participant
  const attendedEvents = attendance.filter(a => String(a["Member ID"]) === String(memberId) && a["Status"] === 'Present');
  attendedEvents.forEach(a => {
    earnedBadges.push({ ...BADGE_DEFINITIONS.ACTIVE_PARTICIPANT, date: a["Date"] || a["timestamp"] });
  });

  // Check Opinion Leader (feedbacks + opinions)
  const userFeedbacks = feedbacks.filter(f => String(f.memberId) === String(memberId) || String(f.authorId) === String(memberId) || String(f.MemberId) === String(memberId));
  userFeedbacks.forEach(f => {
    earnedBadges.push({ ...BADGE_DEFINITIONS.OPINION_LEADER, date: f.timestamp });
  });

  const userOpinions = opinions.filter(o => String(o["Member ID"]) === String(memberId));
  userOpinions.forEach(o => {
    earnedBadges.push({ ...BADGE_DEFINITIONS.OPINION_LEADER, date: o.timestamp });
  });

  return earnedBadges.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
};

export const evaluateCriteria = (member, criteria, payments, attendance) => {
  const memberId = member["Member ID"] || member.id;
  const usedCriteria = member.usedCriteria || {};
  // Backwards compatibility for flat rules
  const ruleGroups = criteria.ruleGroups || [
    {
      conditions: [
        {
          metric: criteria.metric,
          operator: criteria.operator,
          value: criteria.value
        }
      ]
    }
  ];

  const evaluateCondition = (cond) => {
    const { metric, operator, value } = cond;
    const threshold = parseFloat(value);
    let actualValue = 0;

    if (metric === 'donations_amount') {
      actualValue = payments.reduce((sum, p) => {
        if (String(p["Member ID"]) === String(memberId) && p["Status"] === 'Paid') {
          const cat = (p["Category"] || '').toLowerCase();
          const desc = (p["Description"] || '').toLowerCase();
          if (cat.includes('donation') || cat.includes('charity') || desc.includes('donation') || desc.includes('charity')) {
            return sum + parseFloat(p["Amount"] || 0);
          }
        }
        return sum;
      }, 0);
    } else if (metric === 'events_attended') {
      actualValue = attendance.filter(a => String(a["Member ID"]) === String(memberId) && a["Status"] === 'Present').length;
    } else if (metric === 'attendance_rate') {
      const totalEvents = new Set(attendance.map(a => a["Event ID"] || a["Date"])).size;
      const attended = attendance.filter(a => String(a["Member ID"]) === String(memberId) && a["Status"] === 'Present').length;
      actualValue = totalEvents > 0 ? (attended / totalEvents) * 100 : 0;
    }

    const used = usedCriteria[metric] || 0;
    const remainingValue = actualValue - used;

    switch (operator) {
      case '>=': return remainingValue >= threshold;
      case '>': return remainingValue > threshold;
      case '<=': return remainingValue <= threshold;
      case '<': return remainingValue < threshold;
      case '==': return remainingValue === threshold;
      default: return false;
    }
  };

  // Evaluate outer OR groups (ANY group needs to be fully satisfied)
  return ruleGroups.some(group => {
    // Evaluate inner AND conditions (ALL conditions in the group must be satisfied)
    return group.conditions.every(cond => evaluateCondition(cond));
  });
};

export const getCriteriaDeductions = (member, criteria, payments, attendance) => {
  // Determine the deduction amounts by finding the first rule group the member passed.
  // We use the same evaluateCriteria logic but we find WHICH group passed.
  const memberId = member["Member ID"] || member.id;
  const usedCriteria = member.usedCriteria || {};

  const ruleGroups = criteria.ruleGroups || [
    {
      conditions: [
        {
          metric: criteria.metric,
          operator: criteria.operator,
          value: criteria.value
        }
      ]
    }
  ];

  const evaluateCondition = (cond) => {
    const { metric, operator, value } = cond;
    const threshold = parseFloat(value);
    let actualValue = 0;

    if (metric === 'donations_amount') {
      actualValue = payments.reduce((sum, p) => {
        if (String(p["Member ID"]) === String(memberId) && p["Status"] === 'Paid') {
          const cat = (p["Category"] || '').toLowerCase();
          const desc = (p["Description"] || '').toLowerCase();
          if (cat.includes('donation') || cat.includes('charity') || desc.includes('donation') || desc.includes('charity')) {
            return sum + parseFloat(p["Amount"] || 0);
          }
        }
        return sum;
      }, 0);
    } else if (metric === 'events_attended') {
      actualValue = attendance.filter(a => String(a["Member ID"]) === String(memberId) && a["Status"] === 'Present').length;
    } else if (metric === 'attendance_rate') {
      const totalEvents = new Set(attendance.map(a => a["Event ID"] || a["Date"])).size;
      const attended = attendance.filter(a => String(a["Member ID"]) === String(memberId) && a["Status"] === 'Present').length;
      actualValue = totalEvents > 0 ? (attended / totalEvents) * 100 : 0;
    }

    const used = usedCriteria[metric] || 0;
    const remainingValue = actualValue - used;

    switch (operator) {
      case '>=': return remainingValue >= threshold;
      case '>': return remainingValue > threshold;
      case '<=': return remainingValue <= threshold;
      case '<': return remainingValue < threshold;
      case '==': return remainingValue === threshold;
      default: return false;
    }
  };

  for (let group of ruleGroups) {
    if (group.conditions.every(cond => evaluateCondition(cond))) {
      const deductions = {};
      group.conditions.forEach(cond => {
        deductions[cond.metric] = (deductions[cond.metric] || 0) + parseFloat(cond.value);
      });
      return deductions;
    }
  }
  return {}; // No deduction if they somehow didn't pass or had no rules
};
