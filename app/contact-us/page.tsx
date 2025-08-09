import { Mail, Phone, MapPin } from "lucide-react"

export default function ContactUsPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:px-6 md:py-24 lg:py-32">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Contact Us</h1>
          <p className="text-gray-500 md:text-xl/relaxed dark:text-gray-400">
            We'd love to hear from you! Whether you have a question about our products, an order, or just want to say
            hello, feel free to reach out.
          </p>
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-3">
              <Mail className="h-6 w-6 text-primary" />
              <a
                href="mailto:info@aahaanyacreatives.com"
                className="text-lg text-gray-700 dark:text-gray-300 hover:underline"
              >
               minakshis262@gmail.com
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-6 w-6 text-primary" />
              <a href="tel:+919930536206" className="text-lg text-gray-700 dark:text-gray-300 hover:underline">
                +919930536206
              </a>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-6 w-6 text-primary shrink-0" />
              
              <p className="text-lg text-gray-700 dark:text-gray-300">
                Aahaanya Creatives  
                <br />
                Veena Dalvai Industrial Estate SV Road Jogeshwari West
                <br />
                Mumbai, Maharashtra, India
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          {/* You can add a map embed or a contact form here if desired */}
          <img
            src="/client logo.jpg?height=500&width=500"
            width="500"
            height="500"
            alt="Contact Us"
            className="rounded-lg object-cover"
          />
        </div>
      </div>
    </div>
  )
}
