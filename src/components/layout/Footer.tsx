export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © 2026 SIB-Utrecht.
          </p>
          <nav className="flex gap-4">
            <a
              href="https://sib-utrecht.nl/privacy-policy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              target="_blank"
            >
              Privacy Policy
            </a>
            <a
              href="https://sib-utrecht.nl/contact"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              target="_blank"
            >
              Contact
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
