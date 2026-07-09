import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-family, sans-serif)', color: 'var(--text-primary)' }}>
      <h1 style={{ color: 'var(--rotary-blue)', marginBottom: '24px' }}>Privacy Policy</h1>
      
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      
      <h2 style={{ color: 'var(--rotary-blue)', marginTop: '32px', marginBottom: '16px' }}>1. Introduction</h2>
      <p>
        Welcome to the Rotary Club of Amity TVM ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. 
        This privacy policy will inform you as to how we look after your personal data when you visit our application and tell you about your privacy rights and how the law protects you.
      </p>

      <h2 style={{ color: 'var(--rotary-blue)', marginTop: '32px', marginBottom: '16px' }}>2. Data We Collect</h2>
      <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
      <ul>
        <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier, and Rotary ID.</li>
        <li><strong>Contact Data:</strong> includes email address and telephone numbers.</li>
        <li><strong>Profile Data:</strong> includes your interests, preferences, feedback, and survey responses.</li>
        <li><strong>Usage Data:</strong> includes information about how you use our website, products, and services.</li>
      </ul>

      <h2 style={{ color: 'var(--rotary-blue)', marginTop: '32px', marginBottom: '16px' }}>3. How We Use Your Data</h2>
      <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
      <ul>
        <li>To register you as a new club member or app user.</li>
        <li>To manage our relationship with you, including notifying you about changes to our terms or privacy policy.</li>
        <li>To administer and protect our organization and this application (including troubleshooting, data analysis, testing, system maintenance).</li>
        <li>To deliver relevant content and updates to you.</li>
      </ul>

      <h2 style={{ color: 'var(--rotary-blue)', marginTop: '32px', marginBottom: '16px' }}>4. Third-Party Links and Logins</h2>
      <p>
        This application may include links to third-party websites, plug-ins, and applications (such as Facebook/Google login). 
        Clicking on those links or enabling those connections may allow third parties to collect or share data about you. 
        We do not control these third-party websites and are not responsible for their privacy statements.
      </p>

      <h2 style={{ color: 'var(--rotary-blue)', marginTop: '32px', marginBottom: '16px' }}>5. Data Security</h2>
      <p>
        We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. 
        In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
      </p>

      <h2 style={{ color: 'var(--rotary-blue)', marginTop: '32px', marginBottom: '16px' }}>6. Your Legal Rights</h2>
      <p>Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:</p>
      <ul>
        <li>Request access to your personal data.</li>
        <li>Request correction of your personal data.</li>
        <li>Request erasure of your personal data.</li>
        <li>Object to processing of your personal data.</li>
      </ul>

      <h2 style={{ color: 'var(--rotary-blue)', marginTop: '32px', marginBottom: '16px' }}>7. Contact Us</h2>
      <p>
        If you have any questions about this privacy policy or our privacy practices, please contact the club administration.
      </p>
    </div>
  );
};

export default PrivacyPolicy;
