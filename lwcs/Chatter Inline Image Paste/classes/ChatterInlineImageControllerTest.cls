@isTest
public class ChatterInlineImageControllerTest {

    @isTest
    public static void testProcessBase64Image() {
        String base64Data = EncodingUtil.base64Encode(Blob.valueOf('fake image bytes'));

        Test.startTest();
        Map<String, String> result = ChatterInlineImageController.processBase64Image(base64Data, 'test.png', null, null);
        Test.stopTest();

        System.assertNotEquals(null, result.get('fileId'));
        System.assertNotEquals(null, result.get('embedHtml'));
    }

    @isTest
    public static void testProcessBase64Image_withChatterGroup() {
        CollaborationGroup testGroup = new CollaborationGroup(Name = 'Test Group', CollaborationType = 'Public');
        insert testGroup;

        String base64Data = EncodingUtil.base64Encode(Blob.valueOf('fake image bytes'));

        Test.startTest();
        Map<String, String> result = ChatterInlineImageController.processBase64Image(base64Data, 'test.png', 'Test Group', null);
        Test.stopTest();

        System.assertNotEquals(null, result.get('fileId'));
    }

    @isTest
    public static void testProcessBase64Image_withRecordIdFallback() {
        Account testAccount = new Account(Name = 'Test Account');
        insert testAccount;

        String base64Data = EncodingUtil.base64Encode(Blob.valueOf('fake image bytes'));

        Test.startTest();
        Map<String, String> result = ChatterInlineImageController.processBase64Image(base64Data, 'test.png', null, testAccount.Id);
        Test.stopTest();

        System.assertNotEquals(null, result.get('fileId'));
    }
}
