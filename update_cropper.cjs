const fs = require('fs');

let content = fs.readFileSync('src/pages/Profile.jsx', 'utf8');

// Add Cropper imports
if (!content.includes('import Cropper from')) {
  content = content.replace(
    "import React, { useState, useEffect, useMemo } from 'react';",
    "import React, { useState, useEffect, useMemo, useCallback } from 'react';\nimport Cropper from 'react-easy-crop';\nimport { getCroppedImg } from '../utils/cropImage';"
  );
}

// Add state for Cropper
const cropperStates = `  // Cropper State
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
`;
content = content.replace("  const [uploadingImage, setUploadingImage] = useState(false);", "  const [uploadingImage, setUploadingImage] = useState(false);\n" + cropperStates);

// Add Cropper handlers
const cropperHandlers = `
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      let imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      setShowCropper(true);
    }
  };

  const readFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const handleSaveCrop = async () => {
    try {
      setUploadingImage(true);
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      croppedImageBlob.name = 'profile.jpeg';
      
      const res = await api.uploadProfilePicture(currentUser["Member ID"], croppedImageBlob);
      if (res.success) {
        const updateData = { avatarUrl: res.url };
        await api.updateUserProfile(currentUser.chapterId, currentUser["Member ID"], updateData);
        const updatedUser = { ...currentUser, ...updateData };
        sessionStorage.setItem("rc_user_session", JSON.stringify(updatedUser));
        localStorage.setItem("rc_user_session", JSON.stringify(updatedUser));
        setShowCropper(false);
        window.location.reload();
      } else {
        alert("Error uploading image: " + res.error);
        setUploadingImage(false);
      }
    } catch (e) {
      console.error(e);
      alert("Error cropping image: " + e.message);
      setUploadingImage(false);
    }
  };
`;

// Replace handleImageUpload
content = content.replace(/const handleImageUpload = async \(e\) => \{[\s\S]*?setUploadingImage\(false\);\n    \}\n  \};/, cropperHandlers);

// Replace UI in Edit Profile Modal for upload
const newUploadUI = `
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  <Avatar member={currentUser} size={64} />
                  <div>
                    <input type="file" id="avatarUpload" style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
                    <label htmlFor="avatarUpload" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', padding: '8px 16px' }}>
                      <Camera size={14} />
                      Choose Image
                    </label>
                  </div>
                </div>
`;

content = content.replace(
  /<div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>[\s\S]*?<\/div>\s*<\/div>/,
  newUploadUI
);

// Add Cropper Modal at the very end of Edit Profile modal
const cropperModalUI = `
      {/* Cropper Modal */}
      {showCropper && createPortal(
        <div style={{ zIndex: 10000, display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(0,0,0,0.8)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div style={{ position: 'relative', flex: 1, width: '100%' }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div style={{ padding: '24px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => {
                setZoom(e.target.value)
              }}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCropper(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveCrop} disabled={uploadingImage}>
                {uploadingImage ? 'Uploading...' : 'Save & Upload'}
              </button>
            </div>
          </div>
        </div>
      , document.getElementById('root') || document.body)}
`;

content = content.replace(
  ", document.getElementById('root') || document.body)}",
  ", document.getElementById('root') || document.body)}" + cropperModalUI
);

fs.writeFileSync('src/pages/Profile.jsx', content);
