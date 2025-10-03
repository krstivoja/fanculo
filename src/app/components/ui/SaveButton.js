import Button from "./Button";

export default function SaveButton({ saveStatus, onSave }) {
  return (
    <div className="relative">
      {/* Add dot inside button if we have unsaved changes */}
      {saveStatus === "unsaved" && (
        <span className="absolute bg-action w-2.5 h-2.5 flex top-0 right-0 rounded-full -translate-y-[50%] translate-x-[50%]"></span>
      )}
      <Button
        variant="secondary"
        className={`${
          saveStatus === "error"
            ? "!bg-red-600 !text-white hover:!bg-red-700"
            : "!bg-base-2"
        }`}
        onClick={onSave}
        disabled={saveStatus === "saving"}
      >
        {saveStatus === "saving"
          ? "Saving..."
          : saveStatus === "error"
          ? "⚠︎ Error - Retry"
          : "Save"}
      </Button>
    </div>
  );
}
