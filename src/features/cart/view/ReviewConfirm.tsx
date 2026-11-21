import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { paths } from "@/app/routes/path/paths";

/**
 * Obsolete third step — WEB_CART_CHECKOUT uses two steps only.
 * Confirm order happens on `/cart/checkout`.
 */
export default function ReviewConfirm() {
    useEffect(() => {
        // Keep for analytics/debug breadcrumbs if needed later.
    }, []);

    return <Navigate to={paths.client.checkout} replace />;
}
