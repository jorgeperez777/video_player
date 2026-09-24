#if os(iOS)
    import AVKit
    import React
    import UIKit

    /// Native AirPlay route picker (`AVRoutePickerView`) exposed to JS as `<AirPlayButton />`.
    ///
    /// Tapping it opens the same system route picker as Control Center, which is the only
    /// supported way to start AirPlay: there is no public API to route a player by code.
    /// Playback itself is handled by AVPlayer as soon as the user picks a route, provided
    /// the `<Video>` has `allowsExternalPlayback` (the default).
    @objc(RCTAirPlayButton)
    class RCTAirPlayButton: UIView {
        private let routePicker = AVRoutePickerView()

        override init(frame: CGRect) {
            super.init(frame: frame)
            setupRoutePicker()
        }

        @available(*, unavailable)
        required init?(coder aDecoder: NSCoder) {
            fatalError("init(coder:) has not been implemented")
        }

        private func setupRoutePicker() {
            routePicker.backgroundColor = .clear
            if #available(iOS 13.0, *) {
                // Offer TVs / AirPlay 2 displays before audio-only receivers.
                routePicker.prioritizesVideoDevices = true
            }
            addSubview(routePicker)
        }

        override func layoutSubviews() {
            super.layoutSubviews()
            routePicker.frame = bounds
        }

        // MARK: - Props

        /// Color of the icon while no external route is selected.
        @objc
        func setIconColor(_ iconColor: NSNumber?) {
            routePicker.tintColor = RCTConvert.uiColor(iconColor) ?? UIColor.white
        }

        /// Color of the icon while playing on an external route (defaults to the system tint).
        @objc
        func setActiveIconColor(_ activeIconColor: NSNumber?) {
            guard let color = RCTConvert.uiColor(activeIconColor) else { return }
            routePicker.activeTintColor = color
        }

        /// When false, audio-only receivers are listed first (defaults to true: video devices first).
        @objc
        func setPrioritizesVideoDevices(_ prioritizesVideoDevices: Bool) {
            if #available(iOS 13.0, *) {
                routePicker.prioritizesVideoDevices = prioritizesVideoDevices
            }
        }
    }
#endif
