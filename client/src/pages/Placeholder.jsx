import { Link } from 'react-router-dom'

export default function Placeholder({ title = 'Coming soon', description = 'This page is ready for the next implementation phase.' }) {
  return (
    <section className="container page-section placeholder-page">
      <p className="eyebrow gradient-text">ShopFlowAI</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <Link className="btn primary" to="/products">Explore Products</Link>
    </section>
  )
}
