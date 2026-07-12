import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CreditCard,
  FileText,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import SectionHeader from '../components/SectionHeader'
import { EmptyState, ErrorState, ProductGridSkeleton } from '../components/LoadingState'
import api from '../services/api'

const experienceCards = [
  {
    icon: Bot,
    title: 'AI-curated discovery',
    text: 'Find the right product faster with clean filters, smart merchandising, and product-first browsing.',
    stat: '01',
  },
  {
    icon: CreditCard,
    title: 'Flexible checkout',
    text: 'Cash on Delivery and Stripe-ready card payments create a smooth purchase experience for every customer.',
    stat: '02',
  },
  {
    icon: FileText,
    title: 'Professional invoices',
    text: 'Every order can generate a branded PDF invoice with payment, shipping, and line-item details.',
    stat: '03',
  },
]

const journeySteps = [
  { icon: Sparkles, label: 'Discover', text: 'Browse premium tech products with a fast, polished catalog.' },
  { icon: PackageCheck, label: 'Order', text: 'Add items to cart and place COD or card orders securely.' },
  { icon: Truck, label: 'Track', text: 'Follow order status updates from processing to delivery.' },
  { icon: ShieldCheck, label: 'Record', text: 'Receive branded invoices and payment notifications by email.' },
]

export default function Home() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setError('')
        const productsResponse = await api.get('/products', { query: { limit: 4, featured: true } })
        setProducts(productsResponse.data?.products || [])
      } catch (requestError) {
        setProducts([])
        setError(requestError.message || 'Unable to load featured products.')
      } finally {
        setIsLoading(false)
      }
    }

    loadHomeData()
  }, [])

  return (
    <>
      <section className="hero-section premium-hero-section">
        <div className="hero-grid-lines" />
        <div className="hero-glow one" />
        <div className="hero-glow two" />
        <div className="container hero-grid">
          <div className="hero-copy reveal-up">
            <span className="pill"><Zap size={15} /> AI-powered ecommerce</span>
            <h1>Smart Shopping. <span>Smarter Business.</span></h1>
            <p>
              A premium tech store experience built around speed, trust, secure payments,
              and branded order communication from checkout to invoice.
            </p>
            <div className="hero-actions">
              <Link className="btn primary" to="/products">Start Shopping <ArrowRight size={18} /></Link>
              <Link className="btn ghost" to="/categories">Explore Categories</Link>
            </div>
            <div className="trust-row premium-trust-row">
              <span><BadgeCheck size={16} /> Verified checkout</span>
              <span><BadgeCheck size={16} /> Live order updates</span>
              <span><BadgeCheck size={16} /> PDF invoice email</span>
            </div>
          </div>

          <div className="hero-visual reveal-up delay-1 premium-hero-visual" aria-hidden="true">
            <div className="holo-ring ring-one" />
            <div className="holo-ring ring-two" />
            <div className="orbital-card card-a">AI Picks</div>
            <div className="orbital-card card-b">Secure Pay</div>
            <div className="orbital-card card-c">Smart Cart</div>
            <div className="shopping-bag-3d hero-bag-xl">
              <div className="bag-handle" />
              <div className="bag-body">
                <span>S</span>
                <div className="spark spark-1" />
                <div className="spark spark-2" />
              </div>
            </div>
            <div className="holo-panel panel-left">
              <small>Order status</small>
              <strong>Processing</strong>
              <div className="mini-progress"><span /></div>
            </div>
            <div className="holo-panel panel-right">
              <small>Invoice</small>
              <strong>PDF Ready</strong>
              <div className="mini-bars"><i /><i /><i /></div>
            </div>
            <div className="floating-product product-a">⌚</div>
            <div className="floating-product product-b">🎧</div>
          </div>
        </div>
      </section>

      <section className="container section experience-section">
        <SectionHeader
          eyebrow="Experience"
          title="Built for a modern buying journey"
          description="ShopFlowAI combines a premium storefront, reliable checkout, order notifications, and professional invoicing in one customer-friendly flow."
        />
        <Reveal as="div" className="experience-grid-3d">
          {experienceCards.map((item, index) => {
            const Icon = item.icon
            return (
              <article className="experience-card-3d" key={item.title} style={{ '--delay': `${index * 110}ms` }}>
                <span className="experience-number">{item.stat}</span>
                <div className="experience-icon"><Icon size={24} /></div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            )
          })}
        </Reveal>
      </section>

      <section className="container section">
        <SectionHeader
          eyebrow="Featured"
          title="Trending products"
          description="Explore customer-favorite devices and accessories selected for performance, style, and everyday value."
          action={<Link className="text-link" to="/products">View catalog <ArrowRight size={16} /></Link>}
        />
        {isLoading && <ProductGridSkeleton count={4} />}
        {!isLoading && error && <ErrorState title="Unable to load featured products" message={error} />}
        {!isLoading && !error && products.length === 0 && (
          <EmptyState title="No featured products yet" description="Please check back soon or browse the full catalog." />
        )}
        {!isLoading && !error && products.length > 0 && (
          <div className="product-grid">
            {products.slice(0, 4).map((product, index) => (
              <Reveal key={product._id || product.id} delay={index * 90}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section className="container section journey-section">
        <div className="journey-panel-3d">
          <div className="journey-copy">
            <p className="eyebrow gradient-text">Shopping Flow</p>
            <h2>From discovery to delivery, every step feels premium.</h2>
            <p>
              The storefront is designed to guide customers from product discovery to order confirmation with clarity,
              motion, and trust-building details at every interaction.
            </p>
            <Link className="btn primary" to="/products">Explore the store <ArrowRight size={18} /></Link>
          </div>
          <Reveal as="div" className="journey-steps">
            {journeySteps.map((step, index) => {
              const Icon = step.icon
              return (
                <div className="journey-step" key={step.label} style={{ '--delay': `${index * 120}ms` }}>
                  <div className="journey-icon"><Icon size={20} /></div>
                  <div>
                    <strong>{step.label}</strong>
                    <p>{step.text}</p>
                  </div>
                </div>
              )
            })}
          </Reveal>
        </div>
      </section>
    </>
  )
}
