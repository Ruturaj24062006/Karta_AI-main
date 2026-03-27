import { useEffect } from 'react';
import './AdminPageHeader.css';

type AdminPageHeaderProps = {
  title: string;
  description?: string;
};

function AdminPageHeader({ title, description }: AdminPageHeaderProps) {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <header className="admin-page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
    </header>
  );
}

export default AdminPageHeader;
