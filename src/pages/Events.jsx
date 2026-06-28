import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Calendar, MapPin, Clock, Plus, X, PlusCircle } from 'lucide-react';
import './pages.css';

export const Events = ({ data, loading, refreshData }) => {
  const { canManageEvents } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  
  // Form State
  const [eventName, setEventName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [type, setType] = useState('Meeting');
  const [description, setDescription] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading Events...</div>;
  }

  const { events = [], members = [] } = data;
  const todayStr = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  // Generate birthday events dynamically
  const birthdayEvents = members
    .filter(m => m["Birthday"])
    .map(m => {
      const d = new Date(m["Birthday"]);
      if (isNaN(d.getTime())) return null;
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      
      let eventDateStr = `${currentYear}-${month}-${day}`;
      // Project to next year if the birthday has already passed this year
      if (eventDateStr < todayStr) {
        eventDateStr = `${currentYear + 1}-${month}-${day}`;
      }

      return {
        "Event ID": `bday-${m["Member ID"]}-${eventDateStr}`,
        "Event Name": `${m["Name"]}'s Birthday 🎂`,
        "Date": eventDateStr,
        "Time": "All Day",
        "Venue": "",
        "Type": "Birthday",
        "Description": `Wish ${m["Name"]} a very happy birthday!`
      };
    })
    .filter(Boolean);

  const allEvents = [...events, ...birthdayEvents];

  // Split events into Upcoming vs Past
  const upcomingEvents = allEvents
    .filter(e => e["Date"] >= todayStr)
    .sort((a, b) => a["Date"].localeCompare(b["Date"]));

  const pastEvents = allEvents
    .filter(e => e["Date"] < todayStr)
    .sort((a, b) => b["Date"].localeCompare(a["Date"])); // Reverse chronological for past events

  const currentList = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

  const openAddModal = () => {
    setEditingEventId(null);
    setEventName('');
    setDate('');
    setTime('');
    setVenue('');
    setType('Meeting');
    setDescription('');
    setShowEventModal(true);
  };

  const openEditModal = (event) => {
    setEditingEventId(event["Event ID"]);
    setEventName(event["Event Name"] || event["Title"] || '');
    setDate(event["Date"] || '');
    setTime(event["Time"] || '');
    setVenue(event["Venue"] || '');
    setType(event["Type"] || 'Meeting');
    setDescription(event["Description"] || '');
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    
    try {
      const result = await api.deleteEvent(data.events[0]?.chapterId || 'amity-tvm', eventId);
      if (result.success) {
        await refreshData();
      } else {
        alert("Failed to delete event: " + result.error);
      }
    } catch (err) {
      alert("Error deleting event");
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!eventName || !date || !time || !venue) {
      setError('Please fill in all required fields');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      let result;
      if (editingEventId) {
        result = await api.updateEvent(data.events[0]?.chapterId || 'amity-tvm', editingEventId, {
          "Event Name": eventName,
          "Title": eventName,
          date,
          "Date": date,
          time,
          "Time": time,
          venue,
          "Venue": venue,
          type,
          "Type": type,
          description,
          "Description": description
        });
      } else {
        result = await api.addEvent({
          eventName,
          date,
          time,
          venue,
          type,
          description
        });
      }

      if (result.success) {
        setShowEventModal(false);
        await refreshData();
      } else {
        setError(result.error || 'Failed to save event');
      }
    } catch (err) {
      setError('Error saving event');
    } finally {
      setSubmitting(false);
    }
  };

  const getMonthName = (dateStr) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleString('en-US', { month: 'short' });
  };

  const getDayNumber = (dateStr) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return dateObj.getDate();
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="content-area animate-fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Events & Meetings</h1>
          <p className="page-subtitle">Manage club gatherings, projects and functions</p>
        </div>
        {canManageEvents && (
          <button 
            onClick={openAddModal} 
            className="btn btn-primary"
          >
            <Plus size={16} />
            Create Event
          </button>
        )}
      </div>

      {/* Tab controls */}
      <div className="tab-container">
        <button 
          onClick={() => setActiveTab('upcoming')} 
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
        >
          Upcoming ({upcomingEvents.length})
        </button>
        <button 
          onClick={() => setActiveTab('past')} 
          className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
        >
          Past ({pastEvents.length})
        </button>
      </div>

      {/* Events Feed */}
      {currentList.length > 0 ? (
        <div className="events-list">
          {currentList.map((event) => (
            <div key={event["Event ID"]} className="card event-card">
              <div className="event-date-badge">
                <span className="event-date-month">{getMonthName(event["Date"])}</span>
                <span className="event-date-day">{getDayNumber(event["Date"])}</span>
              </div>
              <div className="event-details-meta">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 className="event-title-text">{event["Event Name"]}</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`event-type-pill ${event["Type"] ? event["Type"].toLowerCase() : ''}`}>
                      {event["Type"]}
                    </span>
                    {canManageEvents && event["Type"] !== "Birthday" && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => openEditModal(event)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>Edit</button>
                        <button onClick={() => handleDeleteEvent(event["Event ID"])} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--error)' }}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="event-sub-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} />
                    <span>{formatDisplayDate(event["Date"])}</span>
                  </div>
                  {event["Time"] && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} />
                      <span>{event["Time"]}</span>
                    </div>
                  )}
                  {event["Venue"] && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} />
                      <span>{event["Venue"]}</span>
                    </div>
                  )}
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {event["Description"]}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <Calendar size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <p>No {activeTab} events scheduled.</p>
        </div>
      )}

      {/* EVENT MODAL OVERLAY */}
      {showEventModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowEventModal(false)} style={{ zIndex: 1000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setShowEventModal(false)}>
              <X size={24} />
            </button>
            
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlusCircle size={24} style={{ color: 'var(--rotary-blue)' }} />
              {editingEventId ? 'Edit Event' : 'Schedule New Event'}
            </h2>

            {error && (
              <div className="login-error" style={{ marginBottom: '16px' }}>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="form-label">Event / Meeting Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Weekly Club Assembly"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Time *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 7:00 PM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Venue *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Rotary Hall, Trivandrum"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Event Category</label>
                <select
                  className="form-control"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="Meeting">Meeting (Club Assembly)</option>
                  <option value="Service">Service Project (Charity/Drive)</option>
                  <option value="Social">Social Gathering (Party/District event)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  style={{ height: '80px', resize: 'none' }}
                  placeholder="Provide meeting agendas or project details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '12px', marginTop: '10px' }}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : (editingEventId ? 'Save Changes' : 'Add Event')}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
