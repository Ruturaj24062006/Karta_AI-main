import UniversalSidebar from './UniversalSidebar';
import './SidebarLayout.css';

type SidebarLayoutProps = {
  children: React.ReactNode;
};

function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <div className="sidebar-layout-wrapper">
      <UniversalSidebar />
      <main className="sidebar-layout-content">{children}</main>
    </div>
  );
}

export default SidebarLayout;
