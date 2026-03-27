import { Shield, Zap, TrendingUp, PlayCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  return (
    <div className="home-page">
      <nav className="navbar">
        <div className="container flex items-center justify-between">
          <div className="nav-links">
            <Link to="/history">History</Link>
            <a href="#">Product</a>
            <a href="#">Features</a>
            <a href="#">Research</a>
            <a href="#">Pricing</a>
          </div>

          <Link to="/" className="logo">
            <div className="logo-icon-wrapper">
              <Zap size={24} fill="currentColor" stroke="none" />
            </div>
            <span>KARTA</span>
          </Link>

          <div className="nav-right">
            <Link to="/new-analysis" className="btn btn-primary">
              Start Analysis
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero container text-center">
          <div className="hero-pill">
            <Shield size={16} fill="#E2E8F0" />
            INDIA'S FIRST RBI-COMPLIANT AI CREDIT PLATFORM
          </div>

          <h1>Credit Intelligence That Never Guesses Wrong</h1>

          <p>
            KARTA reads every document, detects every fraud, explains every decision and
            writes the full Credit Appraisal Memo — automatically in 2 hours.
          </p>

          <div className="hero-actions">
            <Link to="/new-analysis" className="btn btn-primary">
              Start Credit Analysis <ArrowRight size={18} />
            </Link>
            <button className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <PlayCircle size={18} /> See How It Works
            </button>
          </div>

          <div className="hero-illustration">
            <div className="mockup-window">
              <div className="mockup-header">
                <div className="mockup-line" style={{ width: '40%' }}></div>
                <div className="mockup-circle"></div>
              </div>
              <div className="mockup-body">
                <div className="mockup-line" style={{ width: '100%' }}></div>
                <div className="mockup-line" style={{ width: '80%' }}></div>
                <div className="mockup-input">
                  <div className="mockup-input-inner"></div>
                </div>
              </div>
              <div className="mockup-cards">
                <div className="mockup-card"></div>
                <div className="mockup-card"></div>
                <div className="mockup-card"></div>
              </div>
            </div>
          </div>
        </section>

        <section className="features-ribbon">
          <div className="container text-center">
            BUILT ON 7 PEER-REVIEWED RESEARCH PAPERS &middot; INDIA-SPECIFIC &middot; RBI-COMPLIANT BY DESIGN
          </div>
        </section>

        <section className="stats">
          <div className="container stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <Zap size={24} strokeWidth={2.5} />
              </div>
              <h3>2 Hours</h3>
              <p>CAM Generation vs.<br />5 Days Manual</p>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <Shield size={24} strokeWidth={2.5} />
              </div>
              <h3>94%+</h3>
              <p>Fraud Detection<br />Accuracy</p>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <TrendingUp size={24} strokeWidth={2.5} />
              </div>
              <h3>20%+</h3>
              <p>Better Default<br />Prediction via RAG</p>
            </div>
          </div>
        </section>

        <section className="powered-by">
          <div className="container">
            <div className="powered-title">POWERED BY</div>
            <div className="logos">
              <div className="logo-item italic" style={{ fontWeight: 800 }}>PdfTable</div>
              <div className="logo-item">XGBoost</div>
              <div className="logo-item" style={{ fontWeight: 800 }}>SHAP</div>
              <div className="logo-item">LangChain</div>
              <div className="logo-item" style={{ fontWeight: 800 }}>FinBERT</div>
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="container">
            <h2>Ready to transform your<br />credit appraisal process?</h2>
            <p>Join top tier Indian financial institutions using KARTA's AI.</p>
            <div className="flex justify-center gap-4 mt-8" style={{ marginTop: '2rem' }}>
              <Link to="/new-analysis" className="btn btn-white">Get Started Today</Link>
              <a href="#" className="btn btn-outline-white">Book a Demo</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="logo">
            <Zap size={20} fill="currentColor" stroke="none" />
            KARTA
          </div>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Compliance</a>
            <a href="#">Contact</a>
          </div>
          <div className="footer-copyright">
            &copy; 2024 KARTA AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
