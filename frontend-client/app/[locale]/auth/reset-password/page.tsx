import ResetPasswordPage from "@/app/components/ResetPasswordPage";

export default async function ResetPasswordRoute({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    return <ResetPasswordPage locale={locale} />;
}
