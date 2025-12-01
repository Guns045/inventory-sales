import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { useAPI } from "@/contexts/APIContext"

import { Eye, EyeOff } from "lucide-react"

export function LoginForm({
    className,
    ...props
}) {
    console.log('LoginForm component loaded');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    let login, api;
    try {
        const auth = useAuth();
        const apiContext = useAPI();
        login = auth?.login;
        api = apiContext?.api;
        console.log('Auth and API contexts loaded successfully');
    } catch (err) {
        console.error('Error loading contexts:', err);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (!api) {
                throw new Error('API not available');
            }

            const response = await api.post('/login', {
                email,
                password
            });

            if (response.data.token && response.data.user && login) {
                login(response.data.token, response.data.user);
                setTimeout(() => {
                    // Redirect based on role
                    const role = response.data.user.role ? response.data.user.role.name : '';
                    if (role === 'Sales') {
                        window.location.href = '/dashboard/sales';
                    } else {
                        window.location.href = '/dashboard';
                    }
                }, 100);
            }
        } catch (err) {
            setError('Login failed. Please check your credentials.');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    console.log('Rendering LoginForm');

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
                    <CardDescription>
                        Login to your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <label htmlFor="email" className="text-sm font-medium">Email</label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <label htmlFor="password" className="text-sm font-medium">Password</label>
                                    <a
                                        href="#"
                                        className="ml-auto text-sm underline-offset-4 hover:underline"
                                    >
                                        Forgot your password?
                                    </a>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            {error && (
                                <div className="text-sm text-red-500 text-center">
                                    {error}
                                </div>
                            )}
                            <Button type="submit" className="w-full bg-[#1e40af] hover:bg-[#1e3a8a] text-white" disabled={loading}>
                                {loading ? "Logging in..." : "Login"}
                            </Button>
                            <div className="text-center text-sm">
                                Don&apos;t have an account?{" "}
                                <span className="text-muted-foreground">
                                    contact admin
                                </span>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
            <div className="text-balance text-center text-xs text-muted-foreground">
                Powered by Jinan Truck Power Indonesia
            </div>
        </div>
    )
}
