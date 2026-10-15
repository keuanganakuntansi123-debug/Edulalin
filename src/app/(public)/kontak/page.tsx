import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { getSiteContentMap } from "@/lib/site-content";
import { ContactForm } from "./contact-form";
import { Reveal } from "@/components/public/animations/reveal";
import { PageHero } from "@/components/public/page-hero";

export const metadata: Metadata = { title: "Kontak | EDULALIN | Edukasi Lalu Lintas" };
export const instant = false;

export default async function KontakPage() {
  const content = await getSiteContentMap();
  const address = content.get("CONTACT_ADDRESS")?.body?.trim() ?? "";
  const email = content.get("CONTACT_EMAIL")?.body?.trim() ?? "";
  const phone = content.get("CONTACT_PHONE")?.body?.trim() ?? "";
  const whatsapp = content.get("CONTACT_WHATSAPP")?.body?.trim() ?? "";
  const social = content.get("CONTACT_SOCIAL")?.body?.trim() ?? "";

  const infoItems = [
    { label: "Email", value: email, icon: "✉", href: email ? `mailto:${email}` : null },
    { label: "Telepon", value: phone, icon: "☎", href: phone ? `tel:${phone.replace(/\s/g, "")}` : null },
    { label: "WhatsApp", value: whatsapp, icon: "💬", href: whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}` : null },
    { label: "Alamat", value: address, icon: "📍", href: null },
    { label: "Media Sosial", value: social, icon: "🌐", href: social && social.includes("http") ? social : null },
  ].filter((i) => i.value);

  return (
    <div className="overflow-x-hidden">
      <PageHero
        badge="Kontak"
        badgeEmoji="📮"
        title="Hubungi Kami"
        description="Punya pertanyaan, masukan, atau membutuhkan informasi mengenai EDULALIN? Silakan hubungi kami melalui kontak yang tersedia."
      />

      <section className="bg-slate-50 py-14 md:py-20">
        <div className="container-page grid gap-8 lg:grid-cols-5">
          <Reveal className="lg:col-span-2">
            <div className="space-y-4">
              {infoItems.length > 0 ? (
                infoItems.map((item) => (
                  <Card key={item.label}>
                    <CardContent className="flex items-start gap-4 pt-5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold">{item.label}</h3>
                        {item.href ? (
                          <a
                            href={item.href}
                            target={item.href.startsWith("http") ? "_blank" : undefined}
                            rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                            className="mt-0.5 block break-words text-sm text-primary hover:underline"
                          >
                            {item.value}
                          </a>
                        ) : (
                          <p className="mt-0.5 break-words text-sm text-muted-foreground">{item.value}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-sm text-muted-foreground">
                      Informasi kontak belum tersedia. Silakan kirim pesan melalui formulir di samping.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </Reveal>

          <Reveal delay={120} className="lg:col-span-3">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold">Kirim Pesan</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Isi formulir di bawah ini, pesan Anda akan kami terima dan proses.
                </p>
                <ContactForm />
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>
    </div>
  );
}