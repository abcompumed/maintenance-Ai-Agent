import axios from "axios";

/**
 * PayPal integration for payment processing
 * Uses PayPal REST API for creating orders and capturing payments
 */

const PAYPAL_API_BASE = "https://api.sandbox.paypal.com"; // Use sandbox for testing
const PAYPAL_EMAIL = "didofido812@gmail.com"; // Hidden from customers

interface PayPalOrder {
  id: string;
  status: string;
  links: Array<{
    rel: string;
    href: string;
  }>;
}

interface PayPalCapture {
  id: string;
  status: string;
  purchase_units: Array<{
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: {
          value: string;
          currency_code: string;
        };
      }>;
    };
  }>;
}

/**
 * Get PayPal access token
 */
async function getAccessToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  try {
    const response = await axios.post(
      `${PAYPAL_API_BASE}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        auth: {
          username: clientId,
          password: clientSecret,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error("Error getting PayPal access token:", error);
    throw new Error("Failed to authenticate with PayPal");
  }
}

/**
 * Create a PayPal order
 */
export async function createPayPalOrder(
  clientId: string,
  clientSecret: string,
  amount: number,
  currency: string = "USD",
  description: string = "ABCompuMed Subscription"
): Promise<PayPalOrder> {
  try {
    const accessToken = await getAccessToken(clientId, clientSecret);

    const response = await axios.post(
      `${PAYPAL_API_BASE}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toString(),
            },
            description,
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: "IMMEDIATE",
              brand_name: "ABCompuMed",
              user_action: "PAY_NOW",
              return_url: `${process.env.VITE_FRONTEND_URL}/payment/success`,
              cancel_url: `${process.env.VITE_FRONTEND_URL}/payment/cancel`,
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    throw new Error("Failed to create payment order");
  }
}

/**
 * Capture a PayPal order
 */
export async function capturePayPalOrder(
  clientId: string,
  clientSecret: string,
  orderId: string
): Promise<PayPalCapture> {
  try {
    const accessToken = await getAccessToken(clientId, clientSecret);

    const response = await axios.post(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error capturing PayPal order:", error);
    throw new Error("Failed to capture payment");
  }
}

/**
 * Verify PayPal payment
 */
export async function verifyPayPalPayment(
  clientId: string,
  clientSecret: string,
  orderId: string
): Promise<{
  verified: boolean;
  amount: number;
  currency: string;
  status: string;
}> {
  try {
    const accessToken = await getAccessToken(clientId, clientSecret);

    const response = await axios.get(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const order = response.data;
    const purchase = order.purchase_units[0];

    return {
      verified: order.status === "COMPLETED",
      amount: parseFloat(purchase.amount.value),
      currency: purchase.amount.currency_code,
      status: order.status,
    };
  } catch (error) {
    console.error("Error verifying PayPal payment:", error);
    return {
      verified: false,
      amount: 0,
      currency: "USD",
      status: "FAILED",
    };
  }
}

/**
 * Generate PayPal payment button HTML
 */
export function generatePayPalButtonHTML(
  amount: number,
  description: string,
  clientId: string
): string {
  return `
    <div id="paypal-button-container"></div>
    <script src="https://www.paypal.com/sdk/js?client-id=${clientId}"></script>
    <script>
      paypal.Buttons({
        createOrder: (data, actions) => {
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: "${amount}"
              },
              description: "${description}"
            }]
          });
        },
        onApprove: (data, actions) => {
          return actions.order.capture().then((details) => {
            console.log('Payment successful:', details);
            window.location.href = '/payment/success?orderId=' + data.orderID;
          });
        },
        onError: (err) => {
          console.error('Payment error:', err);
          window.location.href = '/payment/error';
        }
      }).render('#paypal-button-container');
    </script>
  `;
}

/**
 * Create a simple payment form
 */
export function generatePaymentForm(
  tier: string,
  amount: number,
  description: string
): string {
  return `
    <form method="POST" action="/api/payment/process">
      <input type="hidden" name="tier" value="${tier}" />
      <input type="hidden" name="amount" value="${amount}" />
      <input type="hidden" name="description" value="${description}" />
      <button type="submit" class="btn-art-deco">
        Pay $${amount} with PayPal
      </button>
    </form>
  `;
}
