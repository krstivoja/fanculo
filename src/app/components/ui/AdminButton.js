import { LogoIcon, WordPressIcon } from "../icons";

export default function AdminButton() {
  return (
    <div
      className="bg-contrast hover:bg-action text-base-1 hover:text-highlight p-3 w-fit cursor-pointer transition-all duration-200 hover:bg-opacity-80 group relative"
      onClick={() => (window.location.href = "/wp-admin/")}
      title="Go to WordPress Admin"
    >
      <div className="group-hover:opacity-0 ">
        <LogoIcon />
      </div>
      <div className="absolute inset-0 p-3 opacity-0 group-hover:opacity-100 ">
        <WordPressIcon size={32} />
      </div>
    </div>
  );
}
