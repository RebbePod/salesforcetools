[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/donate/?hosted_button_id=4SUBTZ2KBZKML)

# LWC - Chatter Inline Image Paste
Paste images directly into chatter.

The component adds a **Paste image** box to the Chatter publisher toolbar. Click it, press Ctrl+V (Cmd+V), and the image is uploaded as a file and embedded inline in the post you are writing.

### Install
Download the Zip file and use [workbench](https://workbench.developerforce.com/login.php) or Inspector to easily install in any org.

### Setup
Drop the component on an App Page, Record Page, Home Page, or the Utility Bar. It renders no UI of its own - it hooks into whatever Chatter publisher is on the page.

| Property | Description |
| --- | --- |
| Chatter Group Name | Name of a Chatter Group to share newly uploaded images with. Optional - the file only needs a group when there is no record to share it with. |

The uploaded file has to be shared somewhere so other people can see the image. If a group name is set, the file is shared with that group. Otherwise it is shared with the record you are on - on a Record Page that is the record itself, and from the Utility Bar it is whatever record you are currently viewing.

If there is neither a group name nor a current record (for example on a Home Page or App Page), the file is uploaded as a private file. The image still appears in the post for you, but other users will not be able to load it. Set a Chatter Group Name for those placements.

### Utility Bar setup
Adding it to the Utility Bar is the easiest option - one placement covers every page in the app instead of editing each Lightning page.

1. Setup > **App Manager** > find your Lightning app > **Edit**.
2. Open the **Utility Items (Desktop Only)** tab.
3. **Add Utility Item** > pick **Chatter Inline Image Paste**.
4. Check **Start automatically**.
5. **Save**.

**Start automatically** is required. The component has no UI of its own - it has to be running to hook into the Chatter publisher, and without this checked it does not load until the user clicks the utility, which they never would. With it checked the utility opens with the app and you can leave the panel closed; it keeps working in the background.

### Contents
| Path | Metadata |
| --- | --- |
| `lwc/chatterInlineImagePaste` | LightningComponentBundle |
| `classes/ChatterInlineImageController.cls` | ApexClass - uploads the pasted image as a `ContentVersion` and returns the embed markup |
| `classes/ChatterInlineImageControllerTest.cls` | ApexClass - test coverage |
| `package.xml` | Deployment manifest (API 62.0) |

## Contribute

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/donate/?hosted_button_id=4SUBTZ2KBZKML) - or - [!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/rebbepod)
