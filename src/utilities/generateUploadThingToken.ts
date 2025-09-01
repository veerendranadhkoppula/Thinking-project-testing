// utils/generateUploadThingToken.ts
const generateUploadThingToken = () => {
  const apiKey = process.env.UPLOADTHING_SECRET
  const appId = process.env.UPLOADTHING_APP_ID
  const regions = ['auto']
  if (!apiKey || !appId) throw new Error('Missing UploadThing env variables')
  const tokenPayload = {
    apiKey,
    appId,
    regions,
  }
  return Buffer.from(JSON.stringify(tokenPayload)).toString('base64')
}

export default generateUploadThingToken
