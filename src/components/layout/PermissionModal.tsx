import React, { useRef, useState } from 'react';
import { ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';
import { useFiles } from '../../context/FileContext';

export const PermissionModal: React.FC = () => {
  const { hasGivenPermission, setHasGivenPermission, handleManualFileSelect } = useFiles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // If they've already granted permission (or we just finished), hide this modal
  if (hasGivenPermission) return null;

  const handleAllowClick = () => {
    // Programmatically open the file picker
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessing(true);
      // Wait a tick for UI to update
      await new Promise(res => setTimeout(res, 100));
      
      try {
        await handleManualFileSelect(e.target.files);
        setIsDone(true);
        setTimeout(() => {
          setHasGivenPermission(true);
        }, 800);
      } catch (err) {
        console.error('Failed to import files', err);
        setIsProcessing(false);
      }
    }
  };

  const handleDenyClick = () => {
    // If they deny, we set permission to true so the modal disappears
    // They will just see an empty app. They can always add files later via settings.
    setHasGivenPermission(true);
  };

  return (
    <div className="permission-modal-overlay">
      <div className="permission-modal slide-up">
        {isProcessing ? (
          <div className="permission-processing">
            {isDone ? (
              <>
                <CheckCircle2 size={48} className="text-primary success-pop" />
                <h2>All Set!</h2>
                <p>Your library is ready.</p>
              </>
            ) : (
              <>
                <Loader2 size={48} className="spinner text-primary" />
                <h2>Securing Library...</h2>
                <p>Importing your selected tracks.</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="permission-icon-wrapper">
              <ShieldAlert size={40} className="text-primary" />
            </div>
            
            <h2 className="permission-title">Media Access Required</h2>
            
            <p className="permission-desc">
              Allow <strong>PulseBeats</strong> to access your music files? 
              <br /><br />
              This simulates a native mobile app experience. Your selected files will be securely loaded and saved locally. You won't be asked again.
            </p>

            <div className="permission-actions">
              <button className="perm-btn deny" onClick={handleDenyClick}>
                Deny
              </button>
              <button className="perm-btn allow" onClick={handleAllowClick}>
                Allow Access
              </button>
            </div>
          </>
        )}

        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={onFilesSelected}
        />
      </div>
    </div>
  );
};
