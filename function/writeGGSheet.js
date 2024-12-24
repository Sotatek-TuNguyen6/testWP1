const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');

exports.writeToGoogleSheets = async(data) => {
  try {
    const auth = new GoogleAuth({
      keyFile: "gg.json",
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();

    // Create an instance of Google Sheets API
    const sheets = google.sheets({ version: 'v4', auth: client });

    // ID of the Google Sheets document
    const spreadsheetId = '1gSrnHvBCjEFhU_EQ5gBllKfb5N0yA1PVQ0hk7f4Y-NA';

    // Name of the sheeBao_cao_viewt within the Google Sheets document
    const sheetName = 'Bao_cao_view_2';

    // Specify the range you want to retrieve existing data from
    const rangeToRetrieve = `${sheetName}!A1:D`;

    // Retrieve values from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: rangeToRetrieve,
    });

    // Extract existing values from the response
    const existingValues = response.data.values || [];

    // Append new data to existing data
    // const newData = [
    //   ['David', 28, 'UK'],
    //   ['Emily', 35, 'Australia']
    // ];

    const updatedData = [...existingValues, ...data];

    // Specify the range to write the updated data to
    const rangeToWrite = `${sheetName}!A1`;

    // Write the updated data to Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: rangeToWrite,
      valueInputOption: 'RAW',
      resource: { values: updatedData },
    });

    console.log('Data has been successfully written to Google Sheets!');
  } catch (err) {
    console.error('An error occurred:', err);
  }
}


