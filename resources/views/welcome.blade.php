<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Jinan Truck Power Indonesia</title>
    <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <!-- Tailwind CSS CDN -->
    @viteReactRefresh
    @vite(['resources/js/index.css', 'resources/js/app.jsx'])
</head>

<body>
    <div id="root"></div>
</body>

</html>