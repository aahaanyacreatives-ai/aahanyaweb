import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductCard } from "@/components/product-card"
import { getProducts } from "@/lib/data"
import type { Product } from "@/lib/types"

export default async function HomePage() {
  const products: Product[] = await getProducts()
  const featuredProducts = products.filter((p) => p.category === "FEATURED").slice(0, 4)

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 relative overflow-hidden bg-background">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
          src="https://res.cloudinary.com/dppic0vh8/video/upload/v1754210501/3d_im1cxh.mp4"
        />
        {/* Overlay for better text visibility (optional, adjust opacity) */}
        <div className="absolute top-0 left-0 w-full h-full bg-black/30 z-0" />

        {/* Content Wrapper with z-index to be on top */}
        <div className="container px-4 md:px-6 relative z-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px] items-center">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-5xl font-extrabold tracking-tighter sm:text-6xl xl:text-7xl/none text-foreground">
                  ESSENTIALS
                  <br />
                  FOR
                  <br />
                  EVERYDAY
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  Discover exquisite handcrafted jewellery that tells your unique story. From timeless classics to
                  modern designs, find your perfect piece.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Link
                  href="/female-collection"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  prefetch={false}
                >
                  Shop Now
                </Link>
                <Link
                  href="/contact-us"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  prefetch={false}
                >
                  Contact Us
                </Link>
              </div>
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
                <CardTitle>Premium  Quality</CardTitle>
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
