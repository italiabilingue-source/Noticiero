export async function GET() {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/admin-login',
      'Set-Cookie': `admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
    }
  });
}
