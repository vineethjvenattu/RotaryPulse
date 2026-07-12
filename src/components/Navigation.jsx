import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Papa from 'papaparse';
import { 
  Home, 
  Users, 
  Calendar, 
  CheckSquare, 
  CreditCard, 
  Bell, 
  LogOut, 
  Menu,
  X,
  User,
  ArrowLeft,
  MoreHorizontal,
  Upload,
  Image,
  MessageSquare,
  FileText,
  Briefcase,
  Tag,
  Lock,
  Award
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import './Navigation.css';
import logoImg from '../assets/rotary-logo.png';

// Custom inline SVG Rotary Wheel
export const RotaryLogo = ({ className }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className}
    fill="currentColor"
  >
    {/* Outer wheel */}
    <circle cx="50" cy="50" r="38" stroke="var(--rotary-gold)" strokeWidth="6" fill="none" />
    <circle cx="50" cy="50" r="30" stroke="var(--rotary-blue)" strokeWidth="4" fill="none" />
    {/* Center hub */}
    <circle cx="50" cy="50" r="12" fill="var(--rotary-gold)" />
    <circle cx="50" cy="50" r="6" fill="var(--bg-secondary)" />
    {/* Spokes */}
    {Array.from({ length: 6 }).map((_, i) => {
      const angle = (i * 360) / 6;
      return (
        <line
          key={i}
          x1="50"
          y1="50"
          x2={50 + 26 * Math.cos((angle * Math.PI) / 180)}
          y2={50 + 26 * Math.sin((angle * Math.PI) / 180)}
          stroke="var(--rotary-blue)"
          strokeWidth="3.5"
        />
      );
    })}
    {/* Gear cogs */}
    {Array.from({ length: 24 }).map((_, i) => {
      const angle = (i * 360) / 24;
      return (
        <path
          key={i}
          d="M 47 10 L 53 10 L 52 14 L 48 14 Z"
          transform={`rotate(${angle} 50 50)`}
          fill="var(--rotary-gold)"
        />
      );
    })}
  </svg>
);

export const Navigation = ({ activeTab, setActiveTab, data }) => {
  const { currentUser, globalConfig, logout, canMarkAttendance, isTreasurer, isPresident, isSecretary } = useAuth();
  const isPST = isPresident || isSecretary || isTreasurer;
  const canViewPremiumFeatures = currentUser?.subscriptionStatus === 'Active' || isPST || currentUser?.isSuperAdmin;
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const fileInputRef = useRef(null);

  const handleBulkUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Use selected chapter or fallback (if Super Admin uploads globally, they shouldn't use this button directly or they should pick a chapter first. But let's assume they are browsing a chapter or they have activeChapterId.)
    // Actually, Super Admin can be assigned a chapterId or we need to pass it. Let's just use currentUser.chapterId for now or prompt for chapter ID if super admin.
    const targetChapterId = currentUser.chapterId || prompt("Enter target Chapter ID for upload:");
    if (!targetChapterId) {
      alert("Chapter ID required.");
      return;
    }

    setUploadingCSV(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const expectedHeaders = ['Sl No', 'Name', 'Rotary ID', 'Address', 'Mobile No', 'Profession', 'Spouse Name', 'E-mail', 'DOB'];
          const actualHeaders = results.meta.fields || [];
          
          const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));
          if (missingHeaders.length > 0) {
            alert(`Invalid CSV format. Missing headers: ${missingHeaders.join(', ')}.\n\nPlease download and use the CSV Template.`);
            setUploadingCSV(false);
            event.target.value = null;
            return;
          }

          const membersToUpload = results.data.map(row => {
            let name = (row["Name"] || "").trim();
            let memberId = (row["Rotary ID"] || "").trim() || `TMP-${Date.now()}-${Math.floor(Math.random()*1000)}`;

            const cleanEmail = (row["E-mail"] || "").replace(/\s+/g, '');
            const cleanMobile = (row["Mobile No"] || "").trim();

            return {
              "Member ID": memberId,
              Name: name,
              Email: cleanEmail,
              Mobile: cleanMobile,
              Address: (row["Address"] || "").trim(),
              Profession: (row["Profession"] || "").trim(),
              "Spouse Name": (row["Spouse Name"] || "").trim(),
              DOB: (row["DOB"] || "").trim()
            };
          }).filter(m => m.Name); // Filter out empty rows

          if (window.confirm(`Found ${membersToUpload.length} valid members. Upload to chapter ${targetChapterId}?`)) {
            const uploadResult = await api.bulkUploadMembers(targetChapterId, membersToUpload);
            if (uploadResult.success) {
              alert(`Successfully uploaded ${uploadResult.count} members!`);
              if (window.location) window.location.reload();
            } else {
              alert(`Upload failed: ${uploadResult.error}`);
            }
          }
        } catch (err) {
          alert(`Error processing CSV: ${err.message}`);
        } finally {
          setUploadingCSV(false);
          setShowMobileMore(false);
        }
      },
      error: (err) => {
        alert(`Error reading file: ${err.message}`);
        setUploadingCSV(false);
      }
    });
  };

  // Compute pending approvals count for this user
  const myApprovalCount = React.useMemo(() => {
    if (!currentUser || !data?.paymentEdits) return 0;
    
    // Are we a PST?
    const userRole = currentUser.Role ? String(currentUser.Role).trim().toLowerCase() : "";
    const isPST = ["president", "secretary", "treasurer"].includes(userRole);
    if (!isPST) return 0;

    return data.paymentEdits.filter(edit => {
      // Must be pending
      if (edit.Status !== "pending") return false;
      // We didn't propose it ourselves
      if (edit["Proposed By"] === currentUser["Member ID"]) return false;
      // We haven't approved it yet
      const approvals = edit.Approvals || [];
      if (approvals.includes(currentUser["Member ID"])) return false;

      return true;
    }).length;
  }, [currentUser, data?.paymentEdits]);

  const myClubDetailsApprovalCount = React.useMemo(() => {
    if (!currentUser || !data?.clubDetailsEdits) return 0;
    
    const userRole = currentUser.Role ? String(currentUser.Role).trim().toLowerCase() : "";
    const isPST = ["president", "secretary", "treasurer"].includes(userRole);
    if (!isPST) return 0;

    return data.clubDetailsEdits.filter(edit => {
      if (edit.Status !== "pending") return false;
      if (edit["Proposed By"] === currentUser["Member ID"]) return false;
      const approvals = edit.Approvals || [];
      if (approvals.includes(currentUser["Member ID"])) return false;
      return true;
    }).length;
  }, [currentUser, data?.clubDetailsEdits]);

  const unacknowledgedFeedbackCount = React.useMemo(() => {
    if (!currentUser || !data?.feedbacks) return 0;
    const COMMITTEE_ROLES = globalConfig?.coreCommitteeRoles || ['President', 'Secretary', 'Treasurer'];
    if (!COMMITTEE_ROLES.includes(currentUser["Role"]) && !currentUser.isSuperAdmin) return 0;
    return data.feedbacks.filter(f => !f.acknowledged).length;
  }, [data?.feedbacks, currentUser, globalConfig]);

  const pendingPaymentsCount = React.useMemo(() => {
    if (!currentUser || globalConfig.hideBadges || currentUser.isSuperAdmin) return 0;
    const isPST = currentUser.Role === 'President' || currentUser.Role === 'Secretary' || currentUser.Role === 'Treasurer';
    if (!isPST) return 0;
    if (!data?.payments) return 0;
    return data.payments.filter(p => p["Status"] === "Verification Pending").length;
  }, [data?.payments, currentUser, globalConfig]);

  const navItems = currentUser?.isSuperAdmin ? [
    { id: 'dashboard', label: 'Chapters', icon: Home, visible: true },
    { id: 'awards', label: 'Award Management', icon: Award, visible: true },
    { id: 'profile', label: 'My Profile', icon: User, visible: !!currentUser["Rotary ID"] }
  ] : [
    { id: 'dashboard', label: 'Home', icon: Home, visible: true },
    { id: 'directory', label: 'Directory', icon: Briefcase, visible: true },
    { id: 'marketplace', label: 'Marketplace', icon: Tag, visible: true },
    { id: 'members', label: 'Members', icon: Users, visible: true },
    { id: 'events', label: 'Events', icon: Calendar, visible: true },
    { id: 'attendance', label: 'Attendance', icon: CheckSquare, visible: canMarkAttendance },
    { id: 'payments', label: 'Payments', icon: CreditCard, visible: true },
    { id: 'announcements', label: 'Announcements', icon: Bell, visible: true },
    { id: 'feedbacks', label: 'User Feedbacks', icon: MessageSquare, visible: true },
    { id: 'gallery', label: 'Gallery', icon: Image, visible: true },
    { id: 'club_details', label: 'Club Details', icon: FileText, visible: true },
    { id: 'awards', label: 'Award Management', icon: Award, visible: currentUser?.Role === 'President' || currentUser?.Role === 'Secretary' || currentUser?.Role === 'Treasurer' },
    { id: 'profile', label: 'My Profile', icon: User, visible: true }
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setShowMobileMore(false);
  };

  const visibleItems = navItems.filter(item => item.visible);

  // Core tabs displayed in mobile bottom bar
  const mobileCoreTabs = currentUser?.isSuperAdmin ? [
    { id: 'dashboard', label: 'Chapters', icon: Home }
  ] : [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'gallery', label: 'Gallery', icon: Image }
  ];

  const handleMobileMoreClick = () => {
    setShowMobileMore(!showMobileMore);
  };

  const getActiveTabTitle = () => {
    const active = navItems.find(item => item.id === activeTab);
    return active ? active.label : 'Rotary Pulse';
  };

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <nav className="sidebar">
        <div className="logo-section">
          <img 
            src={logoImg} 
            alt="Rotary Logo" 
            style={{ width: '48px', height: '48px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} 
          />
          <div className="logo-text">
            <h2>Rotary</h2>
            <span>Pulse</span>
          </div>
        </div>

        <div className="nav-links">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const badgeCount = item.id === 'payments' ? (myApprovalCount + (pendingPaymentsCount || 0)) : (item.id === 'club_details' ? myClubDetailsApprovalCount : 0);
            const showBadge = badgeCount > 0;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              >
                <span style={{ position: 'relative', display: 'inline-flex' }}>
                  <Icon size={20} />
                  {showBadge && (
                    <span style={{ position: 'absolute', top: -4, right: -6, width: 14, height: 14, borderRadius: '50%', backgroundColor: 'var(--error)', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{badgeCount}</span>
                  )}
                  {item.id === 'feedbacks' && unacknowledgedFeedbackCount > 0 && (
                    <span style={{ position: 'absolute', top: -4, right: -6, width: 14, height: 14, borderRadius: '50%', backgroundColor: 'var(--error)', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{unacknowledgedFeedbackCount}</span>
                  )}
                </span>
                {item.label}
                {!canViewPremiumFeatures && ['directory', 'marketplace', 'members'].includes(item.id) && (
                  <Lock size={12} style={{ marginLeft: 'auto', color: 'var(--rotary-gold)' }} />
                )}
              </button>
            );
          })}
        </div>

        {currentUser && (
          <div className="nav-profile">
            <Avatar member={currentUser} size={48} className="nav-avatar" />
            <div className="nav-profile-info">
              <div className="nav-profile-name">{currentUser["Name"]}</div>
              <div className="nav-profile-role">{currentUser["Role"]}</div>
            </div>
            <button 
              onClick={logout} 
              className="logout-btn"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </nav>

      {/* MOBILE HEADER */}
      <header className="mobile-header">
        <div className="mobile-header-left" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          {activeTab === 'dashboard' ? (
            <img 
              src={logoImg} 
              alt="Rotary Logo" 
              style={{ width: '36px', height: '36px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} 
            />
          ) : (
            <>
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className="header-back-btn"
                title="Back to Dashboard"
                style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <ArrowLeft size={24} color="white" />
              </button>
              <span className="mobile-header-title-left" style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>
                {getActiveTabTitle()}
              </span>
            </>
          )}
        </div>

        <div className="mobile-header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => {
              if (unacknowledgedFeedbackCount > 0) setActiveTab('feedbacks');
              else setActiveTab('announcements');
            }} 
            className="header-bell-btn"
            title="Notices"
            style={{ position: 'relative', background: 'none', border: 'none', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Bell size={24} color="white" />
            {unacknowledgedFeedbackCount > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: '50%', backgroundColor: 'var(--error)', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{unacknowledgedFeedbackCount}</span>
            )}
          </button>
          {(activeTab !== 'dashboard' || scrolled) && currentUser && (
            <button 
              onClick={() => setActiveTab('profile')} 
              className="header-avatar-btn animate-fade-in"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
                <Avatar member={currentUser} size={32} style={{ border: '2px solid white' }} />
            </button>
          )}
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="mobile-bottom-nav">
        {mobileCoreTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && !showMobileMore;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={22} />
              {tab.label}
            </button>
          );
        })}
        
        {navItems.filter(item => item.visible && !mobileCoreTabs.map(t => t.id).includes(item.id)).length > 0 && (
          <button
            onClick={handleMobileMoreClick}
            className={`mobile-nav-item ${showMobileMore || ['attendance', 'payments', 'announcements', 'profile', 'club_details', 'feedbacks'].includes(activeTab) ? 'active' : ''}`}
          >
            {showMobileMore ? <X size={22} /> : <Menu size={22} />}
            More
          </button>
        )}
      </nav>

      {/* MOBILE "MORE" POPUP MENU */}
      {showMobileMore && (
        <>
          <div className="more-backdrop" onClick={() => setShowMobileMore(false)} />
          <div className="mobile-more-menu">
            {/* Display other items that aren't on mobile core */}
            {navItems
              .filter(item => item.visible && !['dashboard', 'members', 'events', 'gallery'].includes(item.id))
              .map((item) => {
                const Icon = item.icon;
                const badgeCount = item.id === 'payments' ? (myApprovalCount + (pendingPaymentsCount || 0)) : (item.id === 'club_details' ? myClubDetailsApprovalCount : 0);
                const showBadge = badgeCount > 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                    style={{ margin: '4px 0' }}
                  >
                    <span style={{ position: 'relative', display: 'inline-flex' }}>
                      <Icon size={18} />
                      {showBadge && (
                        <span style={{ position: 'absolute', top: -4, right: -6, width: 14, height: 14, borderRadius: '50%', backgroundColor: item.id === 'payments' && pendingPaymentsCount > 0 ? 'var(--rotary-gold)' : 'var(--error)', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badgeCount}</span>
                      )}
                      {item.id === 'feedbacks' && unacknowledgedFeedbackCount > 0 && (
                        <span style={{ position: 'absolute', top: -4, right: -6, width: 14, height: 14, borderRadius: '50%', backgroundColor: 'var(--error)', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unacknowledgedFeedbackCount}</span>
                      )}
                    </span>
                    {item.label}
                    {!canViewPremiumFeatures && ['directory', 'marketplace', 'members'].includes(item.id) && (
                      <Lock size={12} style={{ marginLeft: 'auto', color: 'var(--rotary-gold)' }} />
                    )}
                  </button>
                );
              })}
            
            {(currentUser?.isSuperAdmin || isPresident) && (
              <>
                <input 
                  type="file" 
                  accept=".csv" 
                  id="bulkUploadCsv"
                  style={{ display: 'none' }} 
                  onChange={handleBulkUpload}
                />
                <button
                  onClick={() => document.getElementById('bulkUploadCsv').click()}
                  className="nav-item"
                  style={{ margin: '4px 0', borderTop: '1px solid var(--border-color)', borderRadius: 0, paddingTop: '12px' }}
                >
                  <Upload size={18} />
                  Bulk Upload Members (CSV)
                </button>
              </>
            )}

            <button
              onClick={() => {
                logout();
                setShowMobileMore(false);
              }}
              className="nav-item"
              style={{ color: 'var(--error)', marginTop: '8px', borderTop: '1px solid var(--border-color)', borderRadius: 0, paddingTop: '12px' }}
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </>
      )}
    </>
  );
};
