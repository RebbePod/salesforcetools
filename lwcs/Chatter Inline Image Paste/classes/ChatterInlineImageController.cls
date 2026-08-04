public without sharing class ChatterInlineImageController {

    @AuraEnabled
    public static Map<String, String> processBase64Image(String base64Data, String fileName, String chatterGroupName, Id recordId) {
        Map<String, String> result = new Map<String, String>();

        try {
            Id chatterGroupId;
            if (String.isNotBlank(chatterGroupName)) {
                List<CollaborationGroup> groups = [
                    SELECT Id FROM CollaborationGroup WHERE Name = :chatterGroupName LIMIT 1
                ];
                if (!groups.isEmpty()) {
                    chatterGroupId = groups[0].Id;
                }
            }

            Blob imageBlob = EncodingUtil.base64Decode(base64Data);

            ContentVersion contentVersion = new ContentVersion();
            contentVersion.Title = fileName;
            contentVersion.PathOnClient = '/' + fileName;
            contentVersion.VersionData = imageBlob;
            // FirstPublishLocationId shares the file so other users can load the image.
            // With neither a group nor a record it stays a private file - visible to the
            // uploader only.
            if (chatterGroupId != null) {
                contentVersion.FirstPublishLocationId = chatterGroupId;
            } else if (recordId != null) {
                contentVersion.FirstPublishLocationId = recordId;
            }
            insert contentVersion;

            Id contentDocumentId = contentVersion.ContentDocumentId;
            if (contentDocumentId == null) {
                contentVersion = [
                    SELECT ContentDocumentId
                    FROM ContentVersion
                    WHERE Id = :contentVersion.Id
                ];
                contentDocumentId = contentVersion.ContentDocumentId;
            }

            String baseUrl = URL.getOrgDomainUrl().toExternalForm();
            String orgHost = new URL(baseUrl).getHost();
            String myDomainName = orgHost.substring(0, orgHost.indexOf('.'));
            String fileDomain = 'https://' + myDomainName + '.file.force.com';

            String downloadUrl = fileDomain +
                '/sfc/servlet.shepherd/version/download/' + contentVersion.Id +
                '?asPdf=false&operationContext=CHATTER';

            String embedHtml = '<img src="' + downloadUrl + '"' +
                ' data-fileid="' + contentDocumentId + '" alt="' + fileName + '"' +
                ' contenteditable="false">';

            result.put('fileId', contentDocumentId);
            result.put('embedHtml', embedHtml);

        } catch (Exception e) {
            result.put('error', e.getMessage() + ' (' + e.getTypeName() + ' at line ' + e.getLineNumber() + ')');
        }

        return result;
    }
}