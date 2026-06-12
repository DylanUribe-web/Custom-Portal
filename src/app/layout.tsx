import type { Metadata } from 'next'
import { Epilogue, DM_Sans } from 'next/font/google'
import './globals.css'

const epilogue = Epilogue({
  subsets: ['latin'],
  variable: '--font-epilogue',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CER Patient Portal',
  description: 'Your CER patient portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US" className={`${epilogue.variable} ${dmSans.variable}`}>
      <body className="app-body antialiased">
        <div className="app-shell">{children}</div>
        <footer className="site-footer">
          <div className="footer-top">
            <div className="footer-brand">
              <p className="footer-brand-copy">
                <a href="https://hospitalcer.com/">Tijuana’s premier boutique hospital dedicated to international patients.</a>
                {" "}Experience luxury, safety, and world-class surgical care just minutes from the U.S. border.
              </p>
              <div className="footer-social">
                <a href="https://www.facebook.com/cerhospital" target="_blank" rel="noreferrer">Facebook</a>
                <a href="https://www.instagram.com/cerhospital" target="_blank" rel="noreferrer">Instagram</a>
                <a href="https://www.youtube.com/@cerhospital6156" target="_blank" rel="noreferrer">YouTube</a>
              </div>
            </div>
            <div className="footer-links-group">
              <div>
                <h3>Patient Guide</h3>
                <ul className="footer-links">
                  <li><a href="https://hospitalcer.com/our-hospital">About CER Hospital</a></li>
                  <li><a href="https://hospitalcer.com/our-hospital/hospital-services">Hospital Services</a></li>
                  <li><a href="https://hospitalcer.com/financing">Financing Options</a></li>
                  <li><a href="https://hospitalcer.com/our-hospital/patient-care">Patient Care</a></li>
                  <li><a href="https://hospitalcer.com/blog">Healthcare Blog</a></li>
                </ul>
              </div>
              <div>
                <h3>Specialties</h3>
                <ul className="footer-links">
                  <li><a href="https://hospitalcer.com/bariatric-program">Bariatric Surgery</a></li>
                  <li><a href="https://hospitalcer.com/plastic-surgery-center">Plastic Surgery</a></li>
                  <li><a href="https://hospitalcer.com/blog/taxy-tijuana">Transport</a></li>
                </ul>
              </div>
            </div>
            <div className="footer-contact">
              <h3>Contact Us</h3>
              <p><strong>📍 CER Hospital</strong><br />Av. Diego Rivera 2386, Zona Urbana Río Tijuana, 22010<br />Tijuana, B.C., Mexico</p>
              <p><strong>📞 US Phone:</strong> <a href="tel:+16197346820">+1 619-416-8550</a></p>
              <p><strong>📩 Email:</strong> <a href="mailto:info@cerhospital.com">info@cerhospital.com</a></p>
            </div>
          </div>
          <div className="footer-note">
            <p>
              <strong>Scope of Services:</strong> Cer Group Corporation provides facilitation and coordination services to assist individuals in obtaining medical treatments, procedures, or surgeries in Tijuana, Mexico. It is important to note that we are not a medical provider, and as such, we do not offer medical services or treatment.
            </p>
          </div>
          <div className="footer-bottom">
            <p>© 2026 CER Hospital Tijuana. All Rights Reserved.</p>
            <div className="footer-legal">
              <a href="https://hospitalcer.com/privacy-policy">Privacy Policy</a>
              <a href="https://hospitalcer.com/terms-and-conditions">Terms & Conditions</a>
              <a href="https://hospitalcer.com/accessibility">Accessibility</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
