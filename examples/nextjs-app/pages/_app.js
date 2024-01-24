import {createClient, UsermavenProvider, usePageView} from "@usermaven/nextjs";

// initialize Usermaven client
const usermavenClient = createClient({
    tracking_host: "https://events.usermaven.com",
    key: "UMXLIktQsI",
    autocapture: true
});

// wrap our app with Usermaven provider
function MyApp({Component, pageProps}) {
    // Use the layout defined at the page level, if available
    const getLayout = Component.getLayout || ((page) => page);

    usePageView(usermavenClient); // this hook will send pageview track event on router change

    return (
        <UsermavenProvider client={usermavenClient}>
            {getLayout(<Component {...pageProps} />)}
        </UsermavenProvider>
    )
}


export default MyApp