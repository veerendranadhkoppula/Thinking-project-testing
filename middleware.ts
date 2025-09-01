// import { NextRequest, NextResponse } from 'next/server'

// export function middleware(req: NextRequest) {
//   if (req.nextUrl.pathname.startsWith('/proxy/')) {
//     const newUrl = req.nextUrl.clone()
//     // console.log(
//       '------------------------------------------------------------------------MIDDLEWARE------------------------------------------------------------------------',
//     )
//     newUrl.pathname = '/api/proxy' + req.nextUrl.pathname.replace('/proxy', '')
//     return NextResponse.rewrite(newUrl)
//   }
//   return NextResponse.next()
// }
