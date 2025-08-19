import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductCard } from "@/components/product-card"
import { getProducts } from "@/lib/data"
import type { Product } from "@/lib/types"

// Assuming the attached product image is saved in your public folder as bracelet-hero.jpg
// (Rename your attached IMG-20250806-WA0030.jpg to this and place in /public folder)
import productHeroImg from "@/public/bracelet-hero.jpg"

export default async function HomePage() {
  const products: Product[] = await getProducts()
  const featuredProducts = products.filter((p) => p.category === "FEATURED").slice(0, 4)

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <section
        className="w-full py-12 md:py-20 lg:py-32 bg-[#FFF9F4] transition-colors"
        style={{
          background:
            "linear-gradient(120deg, #fff9f4 70%, rgba(255, 210, 230, 0.12) 100%)",
        }}
      >
        <div className="container px-4 md:px-6">
          <div className="grid gap-10 md:gap-14 lg:gap-24 lg:grid-cols-2 items-center">
            {/* IMAGE ON TOP FOR MOBILE, RIGHT FOR DESKTOP */}
            <div className="block md:hidden mx-auto mb-6 max-w-[300px]">
              <Image
                src={productHeroImg}
                alt="Handcrafted Jewellery Bracelet"
                width={400}
                height={400}
                className="rounded-xl shadow-lg object-cover"
                priority
              />
            </div>

            {/* LEFT SIDE: TEXT CONTENT */}
            <div className="flex flex-col items-start justify-center space-y-5">
              <h1 className="text-4xl sm:text-5xl xl:text-7xl font-extrabold tracking-tight text-[#181838] leading-tight">
                ESSENTIALS <br className="hidden md:block" />
                FOR <br className="hidden md:block" />
                EVERYDAY
              </h1>
              <p className="text-[#83675a] max-w-[540px] text-base md:text-lg xl:text-xl font-medium">
                Discover exquisite handcrafted jewellery that tells your unique story. From timeless classics to
                modern designs, find your perfect piece.
              </p>
              <div className="flex w-full gap-3 mt-4 flex-col sm:flex-row">
                <Link
                  href="/female-collection"
                  className="inline-flex h-12 items-center justify-center rounded-md bg-[#ef4482] text-white px-8 text-base font-semibold shadow transition-all hover:bg-[#d50060] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-pink-300"
                  prefetch={false}
                >
                  Shop Now
                </Link>
                <Link
                  href="/contact-us"
                  className="inline-flex h-12 items-center justify-center rounded-md border-2 border-[#efdbe8] bg-white px-8 text-base font-semibold text-[#181838] shadow transition-all hover:bg-[#fde9f6] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-pink-200"
                  prefetch={false}
                >
                  Contact Us
                </Link>
              </div>
            </div>

            {/* RIGHT SIDE: IMAGE, HIDDEN ON MOBILE */}
            <div className="hidden md:flex justify-center items-center">
              <Image
                src={productHeroImg}
                alt="Handcrafted Jewellery Bracelet"
                width={450}
                height={450}
                className="rounded-2xl shadow-lg object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Featured Products</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Handpicked selections of our most popular and exquisite pieces.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="flex justify-center">
            <Link
              href="/female-collection"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              prefetch={false}
            >
              View All Products
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32 bg-secondary">
        <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6 lg:gap-10">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Why Choose Aahaanya Creatives?
            </h2>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              We are committed to quality, craftsmanship, and customer satisfaction.
            </p>
          </div>
          <div className="grid w-full grid-cols-1 items-center justify-center gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Premium Quality</CardTitle>
                <CardDescription>Each piece is meticulously crafted by skilled artisans.</CardDescription>
              </CardHeader>
              <CardContent>
                <video
                  src="/5-star animation.mp4"
                  style={{ width: '200px', height: 'auto', maxWidth: '100%' }}
                  className="mx-auto"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Unique Designs</CardTitle>
                <CardDescription>Discover exclusive designs that stand out from the crowd.</CardDescription>
              </CardHeader>
              <CardContent>
                <video
                  src="/gemstone.mp4"
                  style={{ width: '200px', height: 'auto', maxWidth: '100%' }}
                  className="mx-auto"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Customer Satisfaction</CardTitle>
                <CardDescription>Your happiness is our priority. Enjoy seamless shopping.</CardDescription>
              </CardHeader>
              <CardContent>
                <video
                  src="review.mp4"
                  style={{ width: '200px', height: 'auto', maxWidth: '100%' }}
                  className="mx-auto"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
