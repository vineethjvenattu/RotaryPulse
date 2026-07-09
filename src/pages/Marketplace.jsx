import React, { useState, useEffect } from 'react';
import { Tag, Plus, MessageSquare, Megaphone, HelpCircle } from 'lucide-react';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { api } from '../services/api';
import './pages.css';

export const Marketplace = ({ data }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('all'); // all, offers, needs
  const [showAddModal, setShowAddModal] = useState(false);
  const [postForm, setPostForm] = useState({ type: 'offer', title: '', description: '', contactPreference: 'whatsapp' });
  const [submitting, setSubmitting] = useState(false);
  
  // Fake data for now, ideally this would be fetched from Firestore
  const [posts, setPosts] = useState([
    {
      id: '1',
      type: 'offer',
      title: '15% Off Legal Consulting for Rotarians',
      description: 'Offering a flat 15% discount on initial legal consultations for corporate law to all Rotary Club members. Reach out via WhatsApp!',
      authorName: 'Aishwarya Raj',
      authorId: 'AR123',
      authorCompany: 'Raj & Associates',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      contactPreference: 'whatsapp'
    },
    {
      id: '2',
      type: 'need',
      title: 'Looking for a reliable Event Management Company',
      description: 'We are organizing our annual corporate summit next month and need a vendor for stage setup, catering, and logistics. Budget is around 5L. Recommendations appreciated!',
      authorName: 'Vineeth Pillai',
      authorId: 'VP456',
      authorCompany: 'TechFlow Solutions',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      contactPreference: 'call'
    }
  ]);

  const filteredPosts = posts.filter(p => activeTab === 'all' || p.type === activeTab);

  const handleCreatePost = async () => {
    if (!postForm.title || !postForm.description) return alert("Title and Description are required.");
    setSubmitting(true);
    
    const newPost = {
      id: Date.now().toString(),
      ...postForm,
      authorName: currentUser.Name,
      authorId: currentUser["Member ID"],
      authorCompany: currentUser.CompanyName || currentUser.Industry || "Member",
      createdAt: new Date().toISOString()
    };

    // Simulate API call
    setTimeout(() => {
      setPosts([newPost, ...posts]);
      setSubmitting(false);
      setShowAddModal(false);
      setPostForm({ type: 'offer', title: '', description: '', contactPreference: 'whatsapp' });
    }, 600);
  };

  const getAuthorMobile = (authorId) => {
    const member = data?.members?.find(m => m["Member ID"] === authorId);
    return member?.Mobile || "";
  };

  return (
    <div className="content-area animate-fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>B2B Marketplace</h1>
          <p className="page-subtitle">Post your business needs or exclusive offers for members</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Create Post
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button 
          className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => setActiveTab('all')}
          style={{ padding: '8px 16px', borderRadius: '20px' }}
        >
          All Posts
        </button>
        <button 
          className={`btn ${activeTab === 'offer' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => setActiveTab('offer')}
          style={{ padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Megaphone size={14} /> Offers
        </button>
        <button 
          className={`btn ${activeTab === 'need' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => setActiveTab('need')}
          style={{ padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <HelpCircle size={14} /> Needs
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredPosts.map(post => (
          <div key={post.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--rotary-blue)', 
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' 
                }}>
                  {post.authorName.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>{post.authorName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{post.authorCompany} • {new Date(post.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              
              <span style={{ 
                padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                backgroundColor: post.type === 'offer' ? '#dcfce7' : '#fef08a',
                color: post.type === 'offer' ? '#166534' : '#854d0e',
                border: `1px solid ${post.type === 'offer' ? '#bbf7d0' : '#fde047'}`
              }}>
                {post.type}
              </span>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>{post.title}</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', fontSize: '14px' }}>
                {post.description}
              </p>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <a 
                href={post.contactPreference === 'whatsapp' ? `https://wa.me/${getAuthorMobile(post.authorId).replace(/\D/g,'')}` : `tel:${getAuthorMobile(post.authorId)}`}
                target="_blank" rel="noopener noreferrer"
                className="btn btn-secondary" 
                style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
              >
                <MessageSquare size={14} />
                Connect via {post.contactPreference === 'whatsapp' ? 'WhatsApp' : 'Call'}
              </a>
            </div>

          </div>
        ))}

        {filteredPosts.length === 0 && (
          <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Tag size={48} style={{ margin: '0 auto 16px', color: '#cbd5e1' }} />
            <h3>No posts found</h3>
            <p>Be the first to post a business need or offer!</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create Marketplace Post"
        subtitle="Share a business need or an exclusive offer."
        footer={
          <>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreatePost} disabled={submitting}>
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </>
        }
      >
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Post Type</label>
          <div style={{ display: 'flex', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="radio" checked={postForm.type === 'offer'} onChange={() => setPostForm({...postForm, type: 'offer'})} />
              <Megaphone size={14} /> Offer a Service/Discount
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="radio" checked={postForm.type === 'need'} onChange={() => setPostForm({...postForm, type: 'need'})} />
              <HelpCircle size={14} /> Ask for a Service/Vendor
            </label>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Title</label>
          <input 
            type="text" 
            className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} 
            placeholder={postForm.type === 'offer' ? "e.g., 20% off web development services" : "e.g., Looking for a CA for filing returns"} 
            value={postForm.title} 
            onChange={e => setPostForm({...postForm, title: e.target.value})} 
          />
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Description</label>
          <textarea 
            className="form-input" style={{ width: '100%', boxSizing: 'border-box', minHeight: '100px', resize: 'vertical' }} 
            placeholder="Provide more details..." 
            value={postForm.description} 
            onChange={e => setPostForm({...postForm, description: e.target.value})} 
          />
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Preferred Contact Method</label>
          <select 
            className="form-input" style={{ width: '100%', boxSizing: 'border-box' }} 
            value={postForm.contactPreference} 
            onChange={e => setPostForm({...postForm, contactPreference: e.target.value})}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="call">Phone Call</option>
          </select>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Members will contact you on your registered mobile number: {currentUser?.Mobile}
          </p>
        </div>
      </Modal>

    </div>
  );
};
