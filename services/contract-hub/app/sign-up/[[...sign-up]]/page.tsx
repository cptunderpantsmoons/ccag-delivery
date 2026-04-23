import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <SignUp />
    </div>
  );
}
