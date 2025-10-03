import * as Icons from "../icons";

export default function IconGallery() {
  const iconEntries = Object.entries(Icons).filter(([name]) =>
    name.includes("Icon")
  );

  return (
    <div className="p-8 bg-base-1">
      <h2 className="text-2xl font-bold mb-6 text-contrast">Icon Gallery</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {iconEntries.map(([name, Icon]) => (
          <div
            key={name}
            className="flex flex-col items-center justify-center p-6 border border-outline rounded-lg bg-base-2 hover:bg-base-3 transition-colors"
          >
            <div className="mb-3 text-contrast">
              <Icon size={48} />
            </div>
            <span className="text-xs text-center text-contrast font-mono break-all">
              {name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
