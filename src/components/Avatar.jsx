import React from 'react';

export const Avatar = ({ member, size = 40, className = '', style = {}, onClick }) => {
  if (!member) return null;

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    } else if (member && member["Member ID"]) {
      window.dispatchEvent(new CustomEvent('viewMember', { detail: member["Member ID"] }));
    }
  };
  
  const imageUrl = member.avatarUrl || member.photoURL || member.Image;
  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={member.Name || "Member"} 
        className={`avatar-img ${className}`}
        onClick={handleClick}
        style={{ width: `var(--avatar-size, ${size}px)`, height: `var(--avatar-size, ${size}px)`, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', ...style }} 
      />
    );
  }

  // Native initials circle fallback
  const nameStr = member.Name || "Unknown";
  const initials = nameStr.substring(0, 2).toUpperCase();

  return (
    <div 
      className={`avatar-circle ${className}`}
      onClick={handleClick}
      style={{ 
        width: `var(--avatar-size, ${size}px)`, 
        height: `var(--avatar-size, ${size}px)`, 
        borderRadius: '50%', 
        backgroundColor: 'var(--rotary-blue)', 
        color: 'white', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontSize: `var(--avatar-font-size, ${size * 0.4}px)`, 
        fontWeight: 600, 
        flexShrink: 0,
        cursor: 'pointer',
        ...style 
      }}
      title={nameStr}
    >
      {initials}
    </div>
  );
};
