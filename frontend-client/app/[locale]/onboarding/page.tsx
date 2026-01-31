import OnboardingPage from '../../components/OnboardingPage';

export default async function Page({
    params
}: {
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params;
    return <OnboardingPage locale={locale} />;
}
