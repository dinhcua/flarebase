// File này sẽ được thêm vào dự án client
import flarebase from "./client-sdk";

// Kiểu dữ liệu cho event
interface TrackEvent {
  event_name: string;
  event_category?: string;
  event_label?: string;
  event_value?: number;
  properties?: Record<string, any>;
}

export class Tracker {
  private flarebase: flarebase;
  private userId?: string;
  private sessionId: string;

  constructor(flarebaseInstance: flarebase) {
    this.flarebase = flarebaseInstance;
    this.sessionId = this.generateSessionId();

    // Lấy userId nếu đã đăng nhập
    this.initUserId();
  }

  // Khởi tạo userId từ token
  private async initUserId() {
    try {
      // Check if user is authenticated by checking token
      const user = await this.flarebase.auth.me().catch(() => null);
      if (user) {
        this.userId = user.id;
      }
    } catch (error) {
      console.error("Error getting user ID for tracking:", error);
    }
  }

  // Tạo session ID để theo dõi phiên làm việc
  private generateSessionId(): string {
    const existingId = sessionStorage.getItem("rb_session_id");
    if (existingId) return existingId;

    const newId =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem("rb_session_id", newId);
    return newId;
  }

  // Track page view
  public trackPageView(path: string = window.location.pathname) {
    this.track({
      event_name: "page_view",
      event_category: "navigation",
      event_label: path,
      properties: {
        path,
        referrer: document.referrer,
        title: document.title,
      },
    });
  }

  // Track click event
  public trackClick(element: string, label?: string) {
    this.track({
      event_name: "click",
      event_category: "interaction",
      event_label: label || element,
      properties: {
        element,
      },
    });
  }

  // Track form submission
  public trackFormSubmit(formId: string, success: boolean = true) {
    this.track({
      event_name: "form_submit",
      event_category: "form",
      event_label: formId,
      properties: {
        form_id: formId,
        success,
      },
    });
  }

  // General tracking method
  public track(event: TrackEvent) {
    const timestamp = new Date().toISOString();

    const trackingData = {
      event_name: event.event_name,
      event_category: event.event_category,
      event_label: event.event_label,
      event_value: event.event_value,
      properties: JSON.stringify(event.properties || {}),
      user_id: this.userId,
      session_id: this.sessionId,
      timestamp,
      url: window.location.href,
      user_agent: navigator.userAgent,
    };

    // Gửi dữ liệu tracking đến server
    this.flarebase
      .collection("events")
      .create(trackingData)
      .catch((error) => {
        console.error("Failed to track event:", error);
      });
  }

  // Update userId khi đăng nhập
  public setUserId(userId: string) {
    this.userId = userId;
  }

  // Clear userId khi đăng xuất
  public clearUserId() {
    this.userId = undefined;
  }
}

// Singleton instance
let trackerInstance: Tracker | null = null;

// Init function
export function initTracker(flarebaseInstance: flarebase): Tracker {
  if (!trackerInstance) {
    trackerInstance = new Tracker(flarebaseInstance);
  }
  return trackerInstance;
}

// Get instance
export function getTracker(): Tracker {
  if (!trackerInstance) {
    throw new Error("Tracker not initialized. Call initTracker first.");
  }
  return trackerInstance;
}
