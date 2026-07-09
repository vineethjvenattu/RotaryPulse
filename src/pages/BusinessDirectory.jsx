import React, { useState, useMemo } from 'react';
import { Search, Briefcase, Phone, Mail, Building } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import './pages.css';

export const BusinessDirectory = ({ data }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All');

  const members = data?.members || [];

  const industries = useMemo(() => {
    const inds = new Set();
    members.forEach(m => {
      if (m.Industry && m.Industry.trim() !== '') {
        inds.add(m.Industry.trim());
      }
    });
    return ['All', ...Array.from(inds)].sort();
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      // Must have some business info to be listed here realistically, but we can list everyone.
      // Let's require them to have an Industry to show up in the directory by default if they select an industry.
      const matchesSearch = (m.Name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                            (m.CompanyName?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const matchesIndustry = selectedIndustry === 'All' || m.Industry === selectedIndustry;
      
      // Filter out users who haven't set up their business profile yet if an industry is selected
      // If "All" is selected, only show people who have at least an Industry or Company Name
      const hasBusinessInfo = m.Industry || m.CompanyName;

      return matchesSearch && matchesIndustry && hasBusinessInfo;
    });
  }, [members, searchQuery, selectedIndustry]);

  return (
    <div className="content-area animate-fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Business Directory</h1>
          <p className="page-subtitle">Rotary Yellow Pages - connect with members professionally</p>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by name or company..." 
              style={{ width: '100%', paddingLeft: '40px', boxSizing: 'border-box' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ flex: '0 0 200px' }}>
            <select 
              className="form-input" 
              style={{ width: '100%', boxSizing: 'border-box' }}
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
            >
              {industries.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Briefcase size={48} style={{ margin: '0 auto 16px', color: '#cbd5e1' }} />
          <h3>No businesses found</h3>
          <p>Try adjusting your search filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {filteredMembers.map(member => (
            <div key={member.id || member["Member ID"]} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Avatar member={member} size={56} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '16px' }}>{member.Name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--rotary-blue)', fontWeight: 500, marginTop: '2px' }}>
                    {member.BusinessDesignation || "Member"}
                  </div>
                </div>
              </div>
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <Building size={16} style={{ color: 'var(--text-secondary)', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {member.CompanyName || "Independent / Not Specified"}
                    </div>
                    {member.Industry && (
                      <span style={{ display: 'inline-block', padding: '2px 8px', background: '#f1f5f9', color: '#475569', borderRadius: '4px', fontSize: '11px', marginTop: '4px', fontWeight: 500 }}>
                        {member.Industry}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {member.Mobile && (
                    <a href={`tel:${member.Mobile}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' }}>
                      <Phone size={14} /> {member.Mobile}
                    </a>
                  )}
                  {member.Email && (
                    <a href={`mailto:${member.Email}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none', wordBreak: 'break-all' }}>
                      <Mail size={14} /> {member.Email}
                    </a>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
