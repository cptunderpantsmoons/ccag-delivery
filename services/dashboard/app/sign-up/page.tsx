import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <SignUp
        appearance={{
          variables: {
            colorPrimary: "#185FA5",
            colorBackground: "#ffffff",
            colorText: "#1a1a2e",
            colorTextSecondary: "#5f6368",
            colorInputBackground: "#ffffff",
            colorInputText: "#1a1a2e",
            colorNeutral: "#e2e4e7",
            borderRadius: "0.5rem",
          },
        }}
      />
    </div>
  );
}
