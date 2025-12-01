import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { useToast } from "@/hooks/useToast";
import { useAPI } from '@/contexts/APIContext';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, User, Shield, Mail } from 'lucide-react';

const ProfileSettings = () => {
    const { api } = useAPI();
    const { user: authUser, refreshUser } = useAuth(); // Assuming refreshUser exists or we trigger a reload
    const { showSuccess, showError } = useToast();
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [profile, setProfile] = useState({
        name: '',
        email: '',
        role: '',
        avatar_url: null
    });

    const [formData, setFormData] = useState({
        name: '',
        password: '',
        password_confirmation: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/profile');
            const { user, role } = response.data;
            setProfile({
                name: user.name,
                email: user.email,
                role: role,
                avatar_url: user.avatar_url
            });
            setFormData(prev => ({ ...prev, name: user.name }));
        } catch (error) {
            showError('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = {
                name: formData.name,
            };

            if (formData.password) {
                if (formData.password !== formData.password_confirmation) {
                    showError('Passwords do not match');
                    setSaving(false);
                    return;
                }
                payload.password = formData.password;
                payload.password_confirmation = formData.password_confirmation;
            }

            const response = await api.put('/profile', payload);

            showSuccess('Profile updated successfully');
            setProfile(prev => ({ ...prev, name: response.data.user.name }));
            setFormData(prev => ({
                ...prev,
                password: '',
                password_confirmation: ''
            }));

            // Refresh global auth state if name changed
            if (authUser.name !== response.data.user.name) {
                window.location.reload(); // Simple way to refresh sidebar etc
            }

        } catch (error) {
            if (error.response?.data?.errors) {
                const messages = Object.values(error.response.data.errors).flat();
                showError(messages[0]);
            } else {
                showError('Failed to update profile');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type and size
        if (!file.type.startsWith('image/')) {
            showError('Please upload an image file');
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB
            showError('Image size should be less than 2MB');
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        setUploading(true);
        try {
            const response = await api.post('/profile/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setProfile(prev => ({ ...prev, avatar_url: response.data.avatar_url }));
            showSuccess('Profile picture updated');
            window.location.reload(); // Refresh to update sidebar
        } catch (error) {
            showError('Failed to upload profile picture');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return <div className="p-6">Loading profile...</div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title="Profile Settings"
                description="Manage your account settings and preferences"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Profile Picture</CardTitle>
                        <CardDescription>Click to change your avatar</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center space-y-4">
                        <div
                            className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-100 cursor-pointer group"
                            onClick={handleAvatarClick}
                        >
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                                    <User size={48} />
                                </div>
                            )}

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="text-white" size={24} />
                            </div>
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />

                        <div className="text-center">
                            <h3 className="font-semibold text-lg">{profile.name}</h3>
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-1">
                                <Shield size={14} />
                                <span>{profile.role}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Settings Form */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Account Details</CardTitle>
                        <CardDescription>Update your personal information</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        id="email"
                                        value={profile.email}
                                        disabled
                                        className="pl-9 bg-gray-50"
                                    />
                                </div>
                                <p className="text-xs text-gray-500">Email cannot be changed directly. Contact admin for assistance.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="pl-9"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <h4 className="text-sm font-medium mb-4">Change Password (Optional)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">New Password</Label>
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="Leave blank to keep current"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password_confirmation">Confirm New Password</Label>
                                        <Input
                                            id="password_confirmation"
                                            name="password_confirmation"
                                            type="password"
                                            value={formData.password_confirmation}
                                            onChange={handleInputChange}
                                            placeholder="Confirm new password"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={saving || uploading}>
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProfileSettings;
