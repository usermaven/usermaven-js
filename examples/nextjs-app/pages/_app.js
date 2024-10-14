import { createClient, UsermavenProvider } from "@usermaven/nextjs";
import { usePageView } from "@usermaven/nextjs";  // Import usePageView from the package

// Initialize Usermaven core
const usermavenClient = createClient({
    trackingHost: "https://events.usermaven.com",
    key: "UMXktPfqmG",
    autocapture: true
});

function MyApp({ Component, pageProps }) {
    const getLayout = Component.getLayout || ((page) => page);

    return (
        <UsermavenProvider client={usermavenClient}>
            <AppWrapper>
                {getLayout(<Component {...pageProps} />)}
            </AppWrapper>
        </UsermavenProvider>
    )
}

// Move AppWrapper to a separate functional component
const AppWrapper = ({ children }) => {
    // usePageView(usermavenClient); // Now this hook is called inside a functional component
    return <>{children}</>;
}

export default MyApp;
