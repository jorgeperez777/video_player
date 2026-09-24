#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE (RCTAirPlayButtonManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(iconColor, NSNumber);
RCT_EXPORT_VIEW_PROPERTY(activeIconColor, NSNumber);
RCT_EXPORT_VIEW_PROPERTY(prioritizesVideoDevices, BOOL);

@end
