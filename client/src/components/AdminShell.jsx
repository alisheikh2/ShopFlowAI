import { NavLink } from 'react-router-dom'
import { BarChart3, Boxes, FolderTree, PackagePlus, ShoppingCart } from 'lucide-react'

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/products', label: 'Products', icon: Boxes },
  { to: '/admin/products/new', label: 'Add Product', icon: PackagePlus },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
]

export default function AdminShell({ children }) {
  return (
    <section className="admin-page premium-admin">
      <aside className="admin-sidebar">
        <h2>ShopFlowAI</h2>
        {adminLinks.map((link) => {
          const Icon = link.icon
          return (
            <NavLink key={link.to} to={link.to} end>
              <Icon size={17} />
              {link.label}
            </NavLink>
          )
        })}
      </aside>
      <div className="admin-content">
        <div className="admin-bg-orb one" />
        <div className="admin-bg-orb two" />
        {children}
      </div>
    </section>
  )
}
