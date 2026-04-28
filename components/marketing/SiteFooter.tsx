import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="container max-w-6xl py-14">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-6 text-ink-500">
              Selectwise helps candidates ace interviews with Hiro-led mock
              sessions, instant feedback, and human coaching.
            </p>
          </div>
          {[
            {
              title: "Product",
              items: [
                ["Features", "/#features"],
                ["Pricing", "/#pricing"],
                ["How it works", "/#how"],
              ],
            },
            {
              title: "Company",
              items: [
                ["About", "/about"],
                ["Careers", "/careers"],
                ["Blog", "/blog"],
                ["Contact", "/contact"],
              ],
            },
            {
              title: "Legal",
              items: [
                ["Privacy", "/privacy-policy"],
                ["Terms", "/terms-and-conditions"],
                ["Security", "/security-policy"],
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-ink-900">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.items.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-ink-500 hover:text-ink-900"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col-reverse items-center justify-between gap-4 border-t border-ink-100 pt-6 md:flex-row">
          <p className="text-xs text-ink-400">
            © {new Date().getFullYear()} Selectwise Labs, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <span className="size-2 rounded-full bg-success-500" />
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
