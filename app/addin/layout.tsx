import Script from "next/script";

export default function AddinLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"
        strategy="afterInteractive"
      />
      <div className="h-screen overflow-y-auto bg-slate-950 text-slate-100 font-sans" id="whizzmail-addin">
        {children}
      </div>
    </>
  );
}
