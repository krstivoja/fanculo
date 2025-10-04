import React, { useState, lazy, Suspense } from "react";
import Header from "../components/editor/Header";

// Lazy load all icons
const BlockIcon = lazy(() => import("../components/icons/BlockIcon"));
const LogoIcon = lazy(() => import("../components/icons/LogoIcon"));
const SettingsIcon = lazy(() => import("../components/icons/SettingsIcon"));
const StyleIcon = lazy(() => import("../components/icons/StyleIcon"));
const SymbolIcon = lazy(() => import("../components/icons/SymbolIcon"));
const TrashIcon = lazy(() => import("../components/icons/TrashIcon"));
const WordPressIcon = lazy(() => import("../components/icons/WordPressIcon"));

// Lazy load UI components
const Button = lazy(() => import("../components/ui/Button"));
const Input = lazy(() => import("../components/ui/Input"));
const Textarea = lazy(() => import("../components/ui/Textarea"));
const Select = lazy(() => import("../components/ui/Select"));
const Toggle = lazy(() => import("../components/ui/Toggle"));
const RadioInput = lazy(() => import("../components/ui/RadioInput"));
const Toast = lazy(() => import("../components/ui/Toast"));
const Modal = lazy(() => import("../components/ui/Modal"));
const Loader = lazy(() => import("../components/ui/Loader"));
const Hr = lazy(() => import("../components/ui/Hr"));
const DashiconButton = lazy(() => import("../components/ui/DashiconButton"));
const SaveButton = lazy(() => import("../components/ui/SaveButton"));
const AdminButton = lazy(() => import("../components/ui/AdminButton"));

const DesignSystemPage = () => {
  const [showToast, setShowToast] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toggleValue, setToggleValue] = useState(false);
  const [radioValue, setRadioValue] = useState("option1");

  const icons = [
    { name: "BlockIcon", component: BlockIcon },
    { name: "LogoIcon", component: LogoIcon },
    { name: "SettingsIcon", component: SettingsIcon },
    { name: "StyleIcon", component: StyleIcon },
    { name: "SymbolIcon", component: SymbolIcon },
    { name: "TrashIcon", component: TrashIcon },
    { name: "WordPressIcon", component: WordPressIcon },
  ];

  return (
    <div id="design-system-page" className="flex flex-col h-screen">
      <Header />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-contrast">Loading Design System...</div>}>
        <div className="flex-1 overflow-y-auto p-8 w-full">
          <div className="flex-1 max-w-7xl mx-auto w-full">
            <h1 className="text-4xl font-bold text-highlight mb-8">
              Design System
            </h1>

          {/* Icons Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-highlight mb-4">
              Icons
            </h2>
            <div className="bg-base-2 border border-outline rounded-lg p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {icons.map(({ name, component: IconComponent }) => (
                  <div
                    key={name}
                    className="flex flex-col items-center gap-3 p-4 bg-base-1 rounded-lg border border-outline hover:border-action transition-colors"
                  >
                    <div className="w-12 h-12 flex items-center justify-center text-highlight">
                      <IconComponent className="w-full h-full" />
                    </div>
                    <p className="text-xs text-contrast text-center">{name}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Buttons Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-highlight mb-4">
              Buttons
            </h2>
            <div className="bg-base-2 border border-outline rounded-lg p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-highlight mb-3">
                  Button Variants
                </h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="ghost">Ghost</Button>
                </div>
              </div>
              <Hr />
              <div>
                <h3 className="text-sm font-semibold text-highlight mb-3">
                  Special Buttons
                </h3>
                <div className="flex flex-wrap gap-4">
                  <SaveButton
                    saveStatus="idle"
                    onSave={() => alert("Save clicked")}
                  />
                  <AdminButton />
                  <DashiconButton icon="admin-settings" />
                </div>
              </div>
            </div>
          </section>

          {/* Input Fields Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-highlight mb-4">
              Form Elements
            </h2>
            <div className="bg-base-2 border border-outline rounded-lg p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-highlight mb-3">
                  Input
                </h3>
                <Input
                  label="Text Input"
                  placeholder="Enter text..."
                  onChange={(e) => console.log(e.target.value)}
                />
              </div>
              <Hr />
              <div>
                <h3 className="text-sm font-semibold text-highlight mb-3">
                  Textarea
                </h3>
                <Textarea
                  label="Textarea"
                  placeholder="Enter longer text..."
                  rows={4}
                  onChange={(e) => console.log(e.target.value)}
                />
              </div>
              <Hr />
              <div>
                <h3 className="text-sm font-semibold text-highlight mb-3">
                  Select
                </h3>
                <Select
                  label="Select Option"
                  options={[
                    { value: "option1", label: "Option 1" },
                    { value: "option2", label: "Option 2" },
                    { value: "option3", label: "Option 3" },
                  ]}
                  onChange={(e) => console.log(e.target.value)}
                />
              </div>
              <Hr />
              <div>
                <h3 className="text-sm font-semibold text-highlight mb-3">
                  Toggle
                </h3>
                <Toggle
                  label="Toggle Switch"
                  checked={toggleValue}
                  onChange={setToggleValue}
                />
              </div>
              <Hr />
              <div>
                <h3 className="text-sm font-semibold text-highlight mb-3">
                  Radio Input
                </h3>
                <div className="space-y-2">
                  <RadioInput
                    label="Option 1"
                    name="radio-group"
                    value="option1"
                    checked={radioValue === "option1"}
                    onChange={(e) => setRadioValue(e.target.value)}
                  />
                  <RadioInput
                    label="Option 2"
                    name="radio-group"
                    value="option2"
                    checked={radioValue === "option2"}
                    onChange={(e) => setRadioValue(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Interactive Components */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-highlight mb-4">
              Interactive Components
            </h2>
            <div className="bg-base-2 border border-outline rounded-lg p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-highlight mb-3">
                  Toast Notification
                </h3>
                <Button onClick={() => setShowToast(true)}>Show Toast</Button>
                {showToast && (
                  <Toast
                    type="success"
                    message="This is a toast notification!"
                    onClose={() => setShowToast(false)}
                  />
                )}
              </div>
              <Hr />
              <div>
                <h3 className="text-sm font-semibold text-highlight mb-3">
                  Modal
                </h3>
                <Button onClick={() => setShowModal(true)}>Open Modal</Button>
                {showModal && (
                  <Modal
                    title="Example Modal"
                    onClose={() => setShowModal(false)}
                  >
                    <p className="text-contrast">This is modal content.</p>
                  </Modal>
                )}
              </div>
              <Hr />
              <div>
                <h3 className="text-sm font-semibold text-highlight mb-3">
                  Loader
                </h3>
                <Loader />
              </div>
            </div>
          </section>

          {/* Cards Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-highlight mb-4">
              Cards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-base-2 border border-outline rounded-lg p-6">
                <h3 className="text-lg font-semibold text-highlight mb-2">
                  Card Title
                </h3>
                <p className="text-contrast text-sm">
                  This is a card component with some example content.
                </p>
              </div>
              <div className="bg-base-2 border border-outline rounded-lg p-6">
                <h3 className="text-lg font-semibold text-highlight mb-2">
                  Card Title
                </h3>
                <p className="text-contrast text-sm">
                  This is a card component with some example content.
                </p>
              </div>
              <div className="bg-base-2 border border-outline rounded-lg p-6">
                <h3 className="text-lg font-semibold text-highlight mb-2">
                  Card Title
                </h3>
                <p className="text-contrast text-sm">
                  This is a card component with some example content.
                </p>
              </div>
            </div>
          </section>

          {/* Colors Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-highlight mb-4">
              Colors
            </h2>
            <div className="bg-base-2 border border-outline rounded-lg p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div>
                  <div className="h-24 bg-base-1 border border-outline rounded-lg mb-3"></div>
                  <p className="text-sm font-medium text-highlight">base-1</p>
                  <p className="text-xs text-contrast">#191c22</p>
                </div>
                <div>
                  <div className="h-24 bg-base-2 border border-outline rounded-lg mb-3"></div>
                  <p className="text-sm font-medium text-highlight">base-2</p>
                  <p className="text-xs text-contrast">#272c35</p>
                </div>
                <div>
                  <div className="h-24 bg-base-3 rounded-lg mb-3"></div>
                  <p className="text-sm font-medium text-highlight">base-3</p>
                  <p className="text-xs text-contrast">#5a606d</p>
                </div>
                <div>
                  <div className="h-24 bg-contrast rounded-lg mb-3"></div>
                  <p className="text-sm font-medium text-highlight">contrast</p>
                  <p className="text-xs text-contrast">#aab2c0</p>
                </div>
                <div>
                  <div className="h-24 bg-highlight rounded-lg mb-3 border border-outline"></div>
                  <p className="text-sm font-medium text-highlight">
                    highlight
                  </p>
                  <p className="text-xs text-contrast">white</p>
                </div>
                <div>
                  <div className="h-24 bg-action rounded-lg mb-3"></div>
                  <p className="text-sm font-medium text-highlight">action</p>
                  <p className="text-xs text-contrast">#0499ff</p>
                </div>
                <div>
                  <div className="h-24 bg-outline rounded-lg mb-3"></div>
                  <p className="text-sm font-medium text-highlight">outline</p>
                  <p className="text-xs text-contrast">#393e46</p>
                </div>
                <div>
                  <div className="h-24 bg-error rounded-lg mb-3"></div>
                  <p className="text-sm font-medium text-highlight">error</p>
                  <p className="text-xs text-contrast">red</p>
                </div>
                <div>
                  <div className="h-24 bg-warning rounded-lg mb-3"></div>
                  <p className="text-sm font-medium text-highlight">warning</p>
                  <p className="text-xs text-contrast">#ffdd00</p>
                </div>
              </div>
            </div>
          </section>

          {/* Typography Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-highlight mb-4">
              Typography
            </h2>
            <div className="bg-base-2 border border-outline rounded-lg p-6 space-y-4">
              <h1 className="text-4xl font-bold text-highlight">Heading 1</h1>
              <h2 className="text-3xl font-semibold text-highlight">
                Heading 2
              </h2>
              <h3 className="text-2xl font-semibold text-highlight">
                Heading 3
              </h3>
              <h4 className="text-xl font-semibold text-highlight">
                Heading 4
              </h4>
              <p className="text-base text-highlight">Body text - Regular</p>
              <p className="text-sm text-contrast">Small text - Contrast</p>
              <p className="text-xs text-contrast">Extra small text</p>
            </div>
          </section>
          </div>
        </div>
      </Suspense>
    </div>
  );
};

export default DesignSystemPage;
