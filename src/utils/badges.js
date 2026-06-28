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

  // Check Early Bird (any Paid payment)
  const hasPaidDues = payments.some(p => p["Member ID"] === memberId && p.Status === 'Paid' && (!p.Purpose || p.Purpose.toLowerCase().includes('due')));
  if (hasPaidDues) {
    earnedBadges.push(BADGE_DEFINITIONS.EARLY_BIRD);
  }

  // Check Philanthropist (any Donation/Charity payment)
  const hasDonated = payments.some(p => p["Member ID"] === memberId && p.Status === 'Paid' && p.Purpose && (p.Purpose.toLowerCase().includes('donation') || p.Purpose.toLowerCase().includes('charity')));
  if (hasDonated) {
    earnedBadges.push(BADGE_DEFINITIONS.PHILANTHROPIST);
  }

  // Check Active Participant (at least 1 attendance)
  const hasAttended = attendance.some(a => a["Member ID"] === memberId && a.Status === 'Present');
  if (hasAttended) {
    earnedBadges.push(BADGE_DEFINITIONS.ACTIVE_PARTICIPANT);
  }

  // Check Opinion Leader (at least 1 feedback or 1 opinion)
  const hasFeedback = feedbacks.some(f => f.memberId === memberId || f.authorId === memberId || f.MemberId === memberId);
  const hasOpinion = opinions.some(o => o["Member ID"] === memberId);
  if (hasFeedback || hasOpinion) {
    earnedBadges.push(BADGE_DEFINITIONS.OPINION_LEADER);
  }

  return earnedBadges;
};
