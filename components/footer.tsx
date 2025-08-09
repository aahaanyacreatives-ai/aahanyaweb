import Link from "next/link"
import { Facebook, Instagram } from "lucide-react" // Import icons

export function Footer() {
  return (
    <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-secondary dark:bg-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">&copy; 2024 Aahaanya Creatives. All rights reserved.</p>
      <nav className="sm:ml-auto flex gap-4 sm:gap-6">
        <Link href="/contact-us" className="text-xs hover:underline underline-offset-4" prefetch={false}>
          Contact Us
        </Link>
        <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
          Privacy Policy
        </Link>
        <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
          Terms of Service
        </Link>
        {/* New Social Media Links */}
        <Link
          href="https://www.facebook.com/share/1Ayb23Moof/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-primary transition-colors"
        >
          <Facebook className="h-5 w-5" />
          <span className="sr-only">Facebook</span>
        </Link>
        <Link
          href="https://www.instagram.com/aahaanyacreatives"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-primary transition-colors"
        >
          <Instagram className="h-5 w-5" />
          <span className="sr-only">Instagram</span>
        </Link>
      </nav>
    </footer>
  )
}
