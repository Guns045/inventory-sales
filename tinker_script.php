$kernel = app(Illuminate\Contracts\Http\Kernel::class);
auth()->loginUsingId(1);
$request = Illuminate\Http\Request::create('/api/delivery-orders', 'GET', ['source_type' => 'SO', 'page' => 1]);
$request->headers->set('Accept', 'application/json');
$response = $kernel->handle($request);
echo $response->getContent();