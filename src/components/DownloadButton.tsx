'use client';

import { useState } from 'react';
import DownloadModal from './DownloadModal';

interface DownloadButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function DownloadButton({ className = '', children = 'Download Now' }: DownloadButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const handleDownload = () => {
    // Trigger the download
    const link = document.createElement('a');
    link.href = '/api/download';
    link.download = 'VibeRyt.exe';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show the modal
    setShowModal(true);
  };

  return (
    <>
      <button
        onClick={handleDownload}
        className={className}
      >
        {children}
      </button>
      <DownloadModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
