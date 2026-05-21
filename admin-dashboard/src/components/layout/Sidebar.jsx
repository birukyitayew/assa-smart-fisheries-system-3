import SidebarNav from './SidebarNav'

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 flex-shrink-0 border-r border-sidebar-border">
      <SidebarNav className="w-full" />
    </aside>
  )
}
