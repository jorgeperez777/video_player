#if os(iOS)
    import React
    import UIKit

    @objc(RCTAirPlayButtonManager)
    class RCTAirPlayButtonManager: RCTViewManager {
        override func view() -> UIView {
            return RCTAirPlayButton()
        }

        override static func requiresMainQueueSetup() -> Bool {
            return true
        }
    }
#endif
