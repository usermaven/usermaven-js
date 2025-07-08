'use client';

import {createClient, UsermavenProvider, usePageView} from "@usermaven/nextjs";  // Import usePageView from the package

// Initialize Usermaven core
const usermavenClient = createClient({
    trackingHost: "https://events.usermaven.com",
    key: "UMXktPfqmG",
    autocapture: true
});


const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
    usePageView(usermavenClient);  // Call usePageView to track page views

    return (
        <UsermavenProvider client={usermavenClient}>
        <>{children}</>
        </UsermavenProvider>
    );
}


export default LayoutWrapper;
